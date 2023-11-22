import pLimit from "p-limit";
import ClusterModule from "puppeteer-cluster";
const { Cluster } = ClusterModule;

const limit = pLimit(10);
const rps = 10;

const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 4,
    puppeteerOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

export class Scraper {
    async getPage(host, url) {
        let status = -1;
        let data = null;

        try {
            let responseHandled = false;

            await cluster.task(async ({ page, data: url }) => {
                page.once('response', response => {
                    if(!responseHandled){
                        if (response.url() === url && response.ok()){
                            status = response.status();
                        } else {
                            status = response.status();
                            throw new Error(`Request failed with status code ${status}`);
                        }
                        responseHandled = true;
                    }
                });

                await page.goto(url);
                data = await page.content();
            });

            await cluster.queue(url);
        } catch (e) {
            console.error(`${e} (${url})`);
            return {
                status: status,
                data: data
            };
        }

        return {
            status: status,
            data: data
        };
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

    static async scrapeSites(db, scraper, startingUrl) {
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
                    promises.push(limit(() => this.processUrl(queue, scrapedUrls, db, scraper, queues)));
                }
            }
            if (promises.length > 0) {
                await Promise.all(promises);
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
        await db.updateLinkStatus(url, res.status);
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

            await db.insertLink(link, null);
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

    async getLinksFromUrl(url) {
        const host = Scraper.getHost(url);
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