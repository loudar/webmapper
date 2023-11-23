import axios from "axios";
import rateLimit from "axios-rate-limit";
import pLimit from "p-limit";
import {Util} from "./Util.mjs";

const limit = pLimit(10);
const requestsPerSecond = 10;

export class Scraper {
    constructor() {
        this.httpPool = {};
    }

    getHttpClient(host) {
        if (!this.httpPool[host]) {
            this.httpPool[host] = rateLimit(axios.create(), {
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
                console.error(`Request failed with status code ${res.status} for ${url}`);
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
                console.log(`429 for ${url}`);
                return {
                    status: 429,
                    data: null
                };
            }
            console.error(`${e} (${url})`);
            return {
                status: e.response ? e.response.status : -1,
                data: null
            };
        }
    }

    static resolveRelativeLink(originUrl, link) {
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
        return [...new Set(validLinks)];
    }

    static async scrapeSites(db, scraper, startingUrl) {
        let queues = new Map();
        let scrapedUrls = [];

        const addToQueue = await db.getUnprocessedLinks();
        let urls = [startingUrl, ...addToQueue.map(row => row.link)];

        for (const url of urls) {
            const host = Util.getHost(url);
            if (!queues.has(host)) {
                queues.set(host, []);
            }
            queues.get(host).push(url);
        }
        console.log(`Created ${queues.size} queues.`);

        /**
         *
         * @type {Promise[]}
         */
        while ([...queues.values()].some(queue => queue.length > 0)) {
            let jobs = [];
            for (const [host, queue] of queues) {
                if (queue.length === 0) {
                    queues.delete(host);
                    continue;
                }
                if (queue.length > 0 && jobs.length < requestsPerSecond * 10) {
                    jobs.push(limit(() => this.processUrl(queue, scrapedUrls, db, scraper, queues)));
                }
            }
            if (jobs.length > 0) {
                await Promise.all(jobs);
            }
        }
    }

    static async processUrl(queue, scrapedUrls, db, scraper, queues) {
        const url = queue.shift();
        if (scrapedUrls.includes(url)) {
            return;
        }
        scrapedUrls.push(url);

        let res = await scraper.getLinksFromUrl(url);
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
        console.log(`Found ${validLinks.length} links on ${url}.`);
        const insertLinks = [];
        for (const link of validLinks) {
            const linkHost = Util.getHost(link);
            if (!linkHost) {
                console.log(`Failed to get host for ${link}.`);
                continue;
            }
            if (!queues.has(linkHost)) {
                queues.set(linkHost, []);
                console.log(`Created queue for ${linkHost}, now ${queues.size} queues.`);
            }
            queues.get(linkHost).push(link);

            insertLinks.push(link);
        }
        await db.insertLinks(insertLinks);
        await db.linkLinksList(url, insertLinks);
        const endTime = new Date();
        console.log(`+${validLinks.length} | Q${queue.length} | ${Util.formatTime(endTime - startTime)} | ${url}`);
    }

    async getLinksFromUrl(url) {
        const host = Util.getHost(url);
        const page = await this.getPage(host, url);

        if (!page.data) {
            console.error(`Failed to get page for ${url}: ${page.status}`);
            return {
                status: page.status,
                links: []
            };
        } else {
            return {
                status: page.status,
                links: Scraper.getLinksOnPage(url, page.data)
            };
        }
    }
}