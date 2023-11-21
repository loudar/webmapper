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

    static async getLinks(url, recursive = false) {
        const fileContent = fs.readFileSync("links.json");
        const previousMap = fileContent.length ? JSON.parse(fileContent.toString()) : {};
        let links, map;
        if (!previousMap[url]) {
            const page = await Scraper.getPage(url);
            if (!page) {
                return {};
            }
            links = Scraper.getLinksOnPage(url, page);

            map = { [url]: links };

            const merged = {...previousMap, ...map};
            fs.writeFileSync("links.json", JSON.stringify(merged, null, 2));
        } else {
            links = previousMap[url];
            map = { [url]: links };
        }

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