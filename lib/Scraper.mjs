import axios from "axios";
import rateLimit from "axios-rate-limit";
import {DB} from "./DB.mjs";

const rps = 10;
const http = rateLimit(axios.create(), { maxRequests: rps, perMilliseconds: 1000, maxRPS: rps })

export class Scraper {
    static async getPage(url) {
        try {
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
            console.error(e.message, url);
            return null;
        }
    }

    static getHost(url) {
        const match = url.match(/https?:\/\/([^/]+)/);
        if (!match) {
            return null;
        }
        return match[1];
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
        const validLinks = links.map(link => {
            const baseLink = link.match(/href="([^"]+)"/)[1].trim();
            return Scraper.resolveRelativeLink(url, baseLink);
        }).filter(link => link !== null && validPrefixes.some(prefix => link.startsWith(prefix)));
        return [...new Set(validLinks)];
    }

    static async scrapeSites(db, startingUrl) {
        let queue = [startingUrl];
        let scrapedUrls = [];

        const addToQueue = await db.getUnprocessedLinks();
        queue = [...queue, ...addToQueue.map(row => row.link)];

        while (queue.length > 0) {
            const url = queue.shift();
            if (scrapedUrls.includes(url)) {
                continue;
            }
            scrapedUrls.push(url);
            let links = await this.getLinksFromUrl(url);
            if (links.length === 0) {
                continue;
            }

            const validLinks = links.filter(link => !scrapedUrls.includes(link) && !queue.includes(link));
            queue = [...queue, ...validLinks];

            for (const link of validLinks) {
                await db.insertLink(link);
                await db.linkLinks(url, link);
            }
            console.log(`Wrote ${validLinks.length} links to DB. Queue length: ${queue.length}`);
        }
    }

    static async getLinksFromUrl(url) {
        const page = await this.getPage(url);

        if (!page) {
            console.error(`Failed to get page for ${url}`);
            return [];
        } else {
            return this.getLinksOnPage(url, page);
        }
    }
}