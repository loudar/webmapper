import {DB} from "../lib/DB.mjs";
import {Scraper} from "../lib/Scraper.mjs";
import dotenv from "dotenv";
import {Util} from "../lib/Util.mjs";
import {HtmlCleaner} from "../lib/HtmlCleaner.mjs";
import {Semaphore} from "../lib/Semaphore.mjs";

dotenv.config();
const db = new DB("data.targoninc.com");
await db.connect();

const excludeTerms = [
    ".mp4"
];
let excludeQuery = excludeTerms.map(() => `link NOT LIKE ?`).join(' AND ');
let bindVariables = excludeTerms.map(term => `%${term}%`);
const query = `SELECT * FROM links WHERE status = 200 AND content = '[nocontent]' AND ${excludeQuery} LIMIT 5000`;
let links = await db.query(query, bindVariables);
let total = links.length;
let done = 0;
let jobs = [];

const scraper = new Scraper();

async function jobFunction(link, index) {
    console.log(`-> ${link.link} (${index}/${total})`);
    const linkHost = Util.getHost(link.link);
    const res = await scraper.getPageSelenium(linkHost, link.link);
    const content = HtmlCleaner.getContent(res);
    const startTime = new Date();
    await db.saveContentToLink(content, link);
    const endTime = new Date();
    done++;
    console.log(`+ ${content ? content.length : 0} in ${Util.formatTime(endTime - startTime)} | ${done}/${total}`);
}

const semaphore = new Semaphore(5);

async function processBatch(links) {
    let i = 0;
    for (const link of links) {
        const j = i++;
        const func = async () => {
            await semaphore.wait();
            await jobFunction(link, j);
            semaphore.release();
        };
        jobs.push(func());
    }
    await Promise.all(jobs);
}

while (links.length > 0) {
    await processBatch(links);
    console.log("Done batch");
    links = await db.query(query, bindVariables);
    total += links.length;
}

process.exit(0);
