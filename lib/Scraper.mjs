import axios from "axios";
import rateLimit from "axios-rate-limit";
import pLimit from "p-limit";
import {Util} from "./Util.mjs";

const limit = pLimit(5);
const requestsPerSecond = 5;

export class Scraper {
    constructor() {
        this.httpPool = {};
    }

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
            const res = await http.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                },
                maxRedirects: 10,
                maxBodyLength: 10 * 1024 * 1024
            });
            if (res.status !== 200) {
                return {
                    status: res.status,
                    data: null
                };
            }
            return {
                status: res.status,
                data: res.data
            };
        } catch (e) {
            if (e.response && e.response.status === 429) {
                return {
                    status: 429,
                    data: null
                };
            }
            return {
                status: e.response ? e.response.status : -1,
                data: null
            };
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
        let queues = new Map();
        let scrapedUrls = [];

        let addToQueue = [];
        if (!onlyNew) {
            console.log("Getting unprocessed links...");
            addToQueue = await db.getUnprocessedLinks();
            console.log(`Got ${addToQueue.length} unprocessed links.`);
        }
        let urls = [startingUrl, ...addToQueue.map(row => row.link)];

        this.addUrlsToQueues(urls, queues);
        urls = null;
        console.log(`Created ${queues.size} queues.`);

        while (addToQueue.length > 0) {
            console.log(`Processing ${queues.size} queues...`);
            await this.processQueues(queues, scrapedUrls, db, scraper);
            addToQueue = await db.getUnprocessedLinks();
            urls = addToQueue.map(row => row.link);
            this.addUrlsToQueues(urls, queues);
        }
    }

    static async processQueues(queues, scrapedUrls, db, scraper) {
        let jobs = [];
        let i = 0;
        const concurrency = 5;
        while (jobs.length > 0 || queues.size > 0) {
            let queuesToDelete = [];
            for (const [domain, queue] of queues) {
                if (queue.length === 0) {
                    queuesToDelete.push(domain);
                    continue;
                }
                if (queue.length > 0 && jobs.length < concurrency) {
                    i++;
                    jobs.push(this.processUrl(queue, scrapedUrls, db, scraper, queues, false));
                }
            }
            for (const domain of queuesToDelete) {
                queues.delete(domain);
            }
            if (jobs.length > 0) {
                await Promise.all(jobs);
                console.log(`Batch done.`);
                jobs = [];
            }
        }
    }

    static addUrlsToQueues(urls, queues) {
        for (const url of urls) {
            const host = Util.getHost(url);
            if (!host) {
                console.log(`Failed to get host for ${url}.`);
                continue;
            }
            const domain = Util.getDomainFromHost(host);
            if (!domain) {
                console.log(`Failed to get domain for ${url} and host ${host}.`);
                continue;
            }
            if (!queues.has(domain)) {
                queues.set(domain, []);
            }
            queues.get(domain).push(url);
        }
    }

    static async processUrl(queue, scrapedUrls, db, scraper, queues, pushOnFind) {
        const url = queue.shift();
        if (scrapedUrls.includes(url)) {
            return;
        }
        scrapedUrls.push(url);

        const existing = await db.getLinkByLink(url);
        if (existing && existing.status !== 200 && existing.status !== null) {
            return;
        }
        console.log(`-> ${url}`);
        let res = await scraper.getLinksFromUrl(url);
        console.log(`Got ${res.status} ${url} in ${Util.formatTime(res.time)}`);
        await db.insertLink(url, res.status);
        const links = res.links;
        if (links.length === 0) {
            return;
        }

        const validLinks = links.filter(link => !scrapedUrls.includes(link) && !queue.includes(link));
        if (validLinks.length === 0) {
            return;
        }

        const startTime = new Date();
        const insertLinks = [];
        for (const link of validLinks) {
            if (pushOnFind) {
                Scraper.pushLinkToQueues(link, queues);
            }

            insertLinks.push(link);
        }
        await db.insertLinks(insertLinks);
        await db.linkLinksList(url, insertLinks);
        const endTime = new Date();
        console.log(`+${insertLinks.length} | Q${queue.length} | ${Util.formatTime(endTime - startTime)} | ${url}`);
    }

    static pushLinkToQueues(link, queues) {
        const linkHost = Util.getHost(link);
        if (!linkHost) {
            console.log(`Failed to get host for ${link}.`);
            return;
        }
        const linkDomain = Util.getDomainFromHost(linkHost);
        if (!linkDomain) {
            console.log(`Failed to get domain for ${link}.`);
            return;
        }
        if (!queues.has(linkDomain)) {
            queues.set(linkDomain, []);
            console.log(`Created queue for ${linkDomain}, now ${queues.size} queues.`);
        }
        queues.get(linkDomain).push(link);
    }

    async getLinksFromUrl(url) {
        const host = Util.getHost(url);
        const startTimePage = new Date();
        const page = await this.getPage(host, url);
        const endTimePage = new Date();

        if (!page.data) {
            return {
                status: page.status,
                links: [],
                time: endTimePage - startTimePage
            };
        } else {
            return {
                status: page.status,
                links: Scraper.getLinksOnPage(url, page.data),
                time: endTimePage - startTimePage
            };
        }
    }
}