import axios from "axios";
import rateLimit from "axios-rate-limit";
import fs from "fs";

const http = rateLimit(axios.create(), { maxRequests: 5, perMilliseconds: 1000, maxRPS: 5 })

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
            if (originUrl.endsWith("/")) {
                return originUrl + link.substring(1);
            }
            return originUrl + link;
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

    static async scrapeSites(startingUrl) {
        let linkMap = {};
        let queue = [startingUrl];
        let scrapedUrls = [];
        if (!fs.existsSync("links.json")) {
            fs.writeFileSync("links.json", "{}");
        }
        const fileContent = fs.readFileSync("links.json");
        linkMap = JSON.parse(fileContent.toString());
        scrapedUrls = Object.keys(linkMap);
        for (const [_, links] of Object.entries(linkMap)) {
            queue = [...queue, ...links];
        }

        while (queue.length > 0) {
            const url = queue.shift();
            if (scrapedUrls.includes(url)) {
                continue;
            }
            scrapedUrls.push(url);
            const page = await this.getPage(url);

            if (!page) {
                console.error(`Failed to get page for ${url}`);
                continue;
            }

            const links = this.getLinksOnPage(url, page);
            const validLinks = links.filter(link => !scrapedUrls.includes(link) && !queue.includes(link));

            linkMap[url] = validLinks;
            queue = [...queue, ...validLinks];

            fs.writeFileSync("links.json", JSON.stringify(linkMap, null, 2));
            console.log(`Wrote ${Object.keys(linkMap).length} links to file. Queue length: ${queue.length}`);
        }

        return linkMap;
    }
}