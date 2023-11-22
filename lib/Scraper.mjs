import axios from "axios";
import rateLimit from "axios-rate-limit";
import pLimit from "p-limit";

const limit = pLimit(10);
const rps = 10;

export class Scraper {
    static httpPool = {};

    static getHttpClient(host) {
        if (!this.httpPool[host]) {
            this.httpPool[host] = rateLimit(axios.create(), { maxRequests: rps, perMilliseconds: 1000, maxRPS: rps });
        }
        return this.httpPool[host];
    }

    static async getPage(host, url) {
        try {
            const http = this.getHttpClient(host);
            const res = await http.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0"
                },
                maxRedirects: 10,
                maxBodyLength: 10 * 1024 * 1024
            });
            if (res.status !== 200) {
                console.error(`Request failed with status code ${res.status} for ${url}`);
                return null;
            }
            return res.data;
        } catch (e) {
            return null;
        }
    }

    static getHost(link) {
        try {
            const url = new URL(link);
            return url.hostname;
        } catch (e) {
            console.error(`Failed to get host for ${link}: ${e}`);
            return null;
        }
    }

    static resolveRelativeLink(originUrl, link) {
        if (link.startsWith("/")) {
            const host = Scraper.getHost(originUrl);
            if (!host) {
                return null;
            }
            const protocol = originUrl.startsWith("https") ? "https" : "http";
            return protocol + host + "/" + link.substring(1);
        }
        return link;
    }

    static getLinksOnPage(url, page) {
        if (!page) {
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

    static async scrapeSites(db, startingUrl) {
        let queues = new Map();
        let scrapedUrls = [];

        const addToQueue = await db.getUnprocessedLinks();
        let urls = [startingUrl, ...addToQueue.map(row => row.link)];

        for (const url of urls) {
            const host = Scraper.getHost(url);
            if (!queues.has(host)) {
                queues.set(host, []);
            }
            queues.get(host).push(url);
        }
        console.log(`Created ${queues.size} queues.`);

        while ([...queues.values()].some(queue => queue.length > 0)) {
            const promises = [];
            for (const [host, queue] of queues) {
                if (queue.length === 0) {
                    queues.delete(host);
                    continue;
                }
                if (queue.length > 0 && promises.length < rps * 10) {
                    promises.push(limit(() => this.processUrl(queue, scrapedUrls, db, queues)));
                }
            }
            if (promises.length > 0) {
                await Promise.all(promises);
            }
        }
    }

    static async processUrl(queue, scrapedUrls, db, queues) {
        const url = queue.shift();
        if (scrapedUrls.includes(url)) {
            return;
        }
        scrapedUrls.push(url);

        let links = await Scraper.getLinksFromUrl(url);
        if (links.length === 0) {
            return;
        }

        const validLinks = links.filter(link => !scrapedUrls.includes(link) && !queue.includes(link));
        if (validLinks.length === 0) {
            return;
        }

        const startTime = new Date();
        console.log(`Found ${validLinks.length} links on ${url}.`);
        for (const link of validLinks) {
            const linkHost = Scraper.getHost(link);
            if (!linkHost) {
                console.log(`Failed to get host for ${link}.`);
                continue;
            }
            if (!queues.has(linkHost)) {
                queues.set(linkHost, []);
                console.log(`Created queue for ${linkHost}, now ${queues.size} queues.`);
            }
            queues.get(linkHost).push(link);

            await db.insertLink(link);
            await db.linkLinks(url, link);
        }
        const endTime = new Date();
        console.log(`+${validLinks.length} | Q${queue.length} | ${Scraper.formatTime(endTime - startTime)} | ${url}`);
    }

    static formatTime(amount) {
        if (amount < 1000) {
            return `${amount}ms`;
        }
        const seconds = Math.floor(amount / 1000);
        const milliseconds = amount % 1000;
        return `${seconds}.${milliseconds}s`;
    }

    static async getLinksFromUrl(url) {
        const host = Scraper.getHost(url);
        const page = await this.getPage(host, url);

        if (!page) {
            console.error(`Failed to get page for ${url}`);
            return [];
        } else {
            return this.getLinksOnPage(url, page);
        }
    }
}