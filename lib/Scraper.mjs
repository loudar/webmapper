import axios from "axios";
import rateLimit from "axios-rate-limit";
import fs from "fs";

const http = rateLimit(axios.create(), { maxRequests: 5, perMilliseconds: 1000, maxRPS: 5 })

export class Scraper {
    static seenUrls = new Set();

    static async getPage(url) {
        try {
            const res = await http.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0"
                }
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
        const links = page.match(/<a[^>]+href="([^"]+)"/g);
        if (!links) {
            return [];
        }
        const filterPrefixes = ["mailto:", "tel:", "javascript:", "mswindowsvideo:", "../", "#"];
        const validLinks = links.map(link => {
            const baseLink = link.match(/href="([^"]+)"/)[1].trim();
            return Scraper.resolveRelativeLink(url, baseLink);
        }).filter(link => link !== null && !filterPrefixes.some(prefix => link.startsWith(prefix)));
        return [...new Set(validLinks)];
    }

    static async getLinks(url, recursive = false) {
        if (this.seenUrls.has(url)) return {}; // stop if we have seen this url
        this.seenUrls.add(url); // add url to seen urls set

        const page = await Scraper.getPage(url);
        if (!page) {
            return {};
        }
        const links = Scraper.getLinksOnPage(url, page);

        let map = { [url]: links };

        if (recursive) {
            const promises = links.map(link => {
                return Scraper.getLinks(link, true);
            });
            const results = await Promise.all(promises);
            results.forEach((result, i) => {
                map = { ...map, ...result }
            });
        }

        return map;
    }

    static async addLinks(newUrl) {
        this.seenUrls = new Set(); // clear seen urls set

        if (!fs.existsSync("links.json")) {
            fs.writeFileSync("links.json", "{}");
        }
        const fileContent = fs.readFileSync("links.json");
        const previousMap = fileContent.length ? JSON.parse(fileContent.toString()) : {};
        if (!newUrl) {
            return previousMap;
        }
        const map = await Scraper.getLinks(newUrl, true);
        const merged = {...previousMap, ...map};
        fs.writeFileSync("links.json", JSON.stringify(merged, null, 2));
        return merged;
    }
}