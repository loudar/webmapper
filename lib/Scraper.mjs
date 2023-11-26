import axios from "axios";
import rateLimit from "axios-rate-limit";
import {Util} from "./Util.mjs";
import {Semaphore} from "./Semaphore.mjs";
import {HtmlCleaner} from "./HtmlCleaner.mjs";
import {Browser, Builder, logging} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const requestsPerSecond = 5;

export class Scraper {
    constructor() {
        this.httpPool = {};
    }

    static userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0";
    static accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";

    getHttpClient(host) {
        if (!this.httpPool[host]) {
            this.httpPool[host] = rateLimit(axios.create({
                timeout: 30 * 1000,
            }), {
                maxRequests: requestsPerSecond,
                perMilliseconds: 1000,
                maxRPS: requestsPerSecond,
            });
        }
        return this.httpPool[host];
    }

    async getPage(host, url) {
        try {
            const http = this.getHttpClient(host);
            const preRes = await http.get(url, {
                headers: {
                    "User-Agent": Scraper.userAgent,
                    "Accept": Scraper.accept,
                    "Range": "bytes=0-1023"
                },
                maxRedirects: 10,
                maxBodyLength: 10 * 1024 * 1024
            });

            const isFileDownload = preRes.headers['content-type'] && !preRes.headers['content-type'].startsWith("text");

            if (!isFileDownload) {
                const res = await http.get(url, {
                    headers: {
                        "User-Agent": Scraper.userAgent,
                        "Accept": Scraper.accept,
                    },
                    maxRedirects: 10,
                    maxBodyLength: 10 * 1024 * 1024
                });

                return {
                    status: res.status,
                    data: res.data,
                    isFileDownload: isFileDownload
                };
            } else {
                return {
                    status: preRes.status,
                    data: "[download]",
                    isFileDownload: isFileDownload
                };
            }
        } catch (e) {
            if (e.response && e.response.status === 429) {
                return {
                    status: 429,
                    data: null,
                    isFileDownload: false
                };
            }
            return {
                status: e.response ? e.response.status : -1,
                data: null,
                isFileDownload: false
            };
        }
    }

    async getPageSelenium(host, url) {
        try {
            const http = this.getHttpClient(host);
            const preRes = await http.get(url, {
                headers: {
                    "User-Agent": Scraper.userAgent,
                    "Accept": Scraper.accept,
                    "Range": "bytes=0-1023"
                },
                maxRedirects: 10,
                maxBodyLength: 10 * 1024 * 1024
            });

            const isFileDownload = preRes.headers['content-type'] && !preRes.headers['content-type'].startsWith("text");

            if (!isFileDownload) {
                const res = await http.get(url, {
                    headers: {
                        "User-Agent": Scraper.userAgent,
                        "Accept": Scraper.accept,
                    },
                    maxRedirects: 10,
                    maxBodyLength: 10 * 1024 * 1024
                });

                const actualContent = await Scraper.getContentWithSelenium(host, url);
                if (actualContent) {
                    console.log(`Got content with selenium for ${url}: ${actualContent.length}`);
                }
                const content = actualContent || res.data;

                return {
                    status: res.status,
                    data: content,
                    isFileDownload: isFileDownload
                };
            } else {
                return {
                    status: preRes.status,
                    data: "[download]",
                    isFileDownload: isFileDownload
                };
            }
        } catch (e) {
            if (e.response && e.response.status === 429) {
                return {
                    status: 429,
                    data: null,
                    isFileDownload: false
                };
            }
            return {
                status: e.response ? e.response.status : -1,
                data: null,
                isFileDownload: false
            };
        }
    }

    static async getContentWithSelenium(host, url) {
        let logging_prefs = new logging.Preferences();
        logging_prefs.setLevel(logging.Type.BROWSER,logging.Level.OFF);
        let chrome_options = new chrome.Options().headless().setLoggingPrefs(logging_prefs);
        let driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(chrome_options).build();
        try {
            await driver.get(url);
            let previousContent = '';
            let currentContent = '';

            let iteration = 0;
            do {
                iteration++;
                await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);
                await driver.sleep(1000);
                previousContent = currentContent;
                currentContent = await driver.executeScript(`return document.documentElement.innerHTML`);
            } while (currentContent !== previousContent && iteration < 30);

            return currentContent;

        } finally {
            await driver.quit();
        }
    }

    static resolveRelativeLink(originUrl, link) {
        if (link.startsWith("//")) {
            return "https:" + link;
        }
        if (link.startsWith("/")) {
            const host = Util.getHost(originUrl);
            if (!host) {
                return null;
            }
            const protocol = originUrl.startsWith("https") ? "https" : "http";
            return protocol + host + "/" + link.substring(1);
        }
        return link;
    }

    static getLinksOnPage(url, page) {
        if (!page || page.constructor !== String) {
            return [];
        }
        const links = page.match(/<a[^>]+href="([^"]+)"/g);
        if (!links) {
            return [];
        }
        const validPrefixes = ["http://", "https://"];
        let validLinks = links.map(link => {
            const baseLink = link.match(/href="([^"]+)"/)[1].trim();
            return Scraper.resolveRelativeLink(url, baseLink);
        }).filter(link => link !== null && validPrefixes.some(prefix => link.startsWith(prefix) && link !== prefix));
        validLinks = validLinks.map(link => {
            if (link.endsWith("/")) {
                return link.substring(0, link.length - 1);
            }
            return link;
        });
        validLinks = validLinks.filter(link => {
            if (link === url) {
                return false;
            }
            if (!link.includes(".")) {
                return false;
            }
            return true;
        });
        return [...new Set(validLinks)];
    }

    static async scrapeSites(db, scraper, startingUrl, onlyNew) {
        let scrapedUrls = [];

        let addToQueue = [];
        if (!onlyNew) {
            console.log("Getting unprocessed links...");
            addToQueue = await db.getUnprocessedLinks();
            console.log(`Got ${addToQueue.length} unprocessed links.`);
        }
        let urls = [startingUrl, ...addToQueue.map(row => row.link)];

        const semaphore = new Semaphore(10);
        let total = urls.length;
        while (urls.length > 0) {
            console.log(`Processing ${urls.length} links...`);
            await this.processBatch(semaphore, total, urls, scrapedUrls, db, scraper);
            addToQueue = await db.getUnprocessedLinks();
            urls = addToQueue.map(row => row.link);
            total += urls.length;
        }
    }

    static async processBatch(semaphore, total, urls, scrapedUrls, db, scraper) {
        let jobs = [];
        let i = 0;
        for (const url of urls) {
            const j = i++;
            const func = async () => {
                await semaphore.wait();
                const info = await this.processUrl(url, scrapedUrls, db, scraper, urls, false);
                if (info.time > 0 && info.links.length > 0) {
                    console.log(`+${info.links.length} | ${j}/${total} | ${Util.formatTime(info.time)} | ${url}`);
                }
                semaphore.release();
            };
            jobs.push(func());
        }
        await Promise.all(jobs);
        console.log(`Batch done.`);
    }

    static async processUrl(url, scrapedUrls, db, scraper, queues, pushOnFind) {
        if (scrapedUrls.includes(url)) {
            return {
                time: 0,
                links: []
            };
        }
        scrapedUrls.push(url);

        const startTime = new Date();
        const existing = await db.getLinkByLink(url);
        if (existing && existing.status !== 200 && existing.status !== null) {
            const endTime = new Date();
            return {
                time: endTime - startTime,
                links: []
            };
        }
        console.log(`-> ${url}`);
        let res = await scraper.getLinksFromUrl(url);
        console.log(`${Util.formatTime(res.time)} for ${res.status} (${res.content.length}) ${url}`);
        await db.insertLink(url, res.status, res.content);
        const links = res.links.filter(link => !scrapedUrls.includes(link));
        if (links.length === 0) {
            const endTime = new Date();
            return {
                time: endTime - startTime,
                links: []
            };
        }

        console.log(`${links.length.toString().padStart(4, " ")} -> DB`);
        await db.insertLinks(links);
        await db.linkLinksList(url, links);
        const endTime = new Date();
        return {
            time: endTime - startTime,
            links
        };
    }

    async getLinksFromUrl(url) {
        const host = Util.getHost(url);
        const startTimePage = new Date();
        const page = await this.getPage(host, url);
        const endTimePage = new Date();

        const content = HtmlCleaner.getContent(page);
        const validStatuses = [200, 203, 301, 302];
        if (!validStatuses.includes(page.status) || page.isFileDownload) {
            return {
                status: page.status,
                links: [],
                content,
                time: endTimePage - startTimePage
            };
        } else {
            return {
                status: page.status,
                links: Scraper.getLinksOnPage(url, page.data),
                content,
                time: endTimePage - startTimePage
            };
        }
    }
}