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
    "microsoft",
    "xbox",
    "whatsapp",
    "google",
    "azure",
    "skype",
    "linkedin",
    "bing",
    "twitter",
    "aka.ms"
];
let excludeQuery = excludeTerms.map(() => `link NOT LIKE ?`).join(' AND ');
let bindVariables = excludeTerms.map(term => `%${term}%`);
const query = `SELECT * FROM links WHERE status = 200 AND content IS NULL AND ${excludeQuery} LIMIT 5000`;
let links = await db.query(query, bindVariables);
let done = 0;
let jobs = [];

const scraper = new Scraper();
async function jobFunction(link, index) {
    console.log(`-> ${link.link} (${index}/${links.length})`);
    const linkHost = Util.getHost(link.link);
    const res = await scraper.getPage(linkHost, link.link);
    if (res.isFileDownload) {
        console.log(`Skipping ${link.link} because it's a file download.`);
        done++;
        return;
    }
    let content = res.data;
    if (!content) {
        done++;
        console.error(`Failed to get content for ${link.link} (${done}/${links.length})`);
        return;
    }
    content = HtmlCleaner.clean(content);
    const query = "UPDATE links SET content = ? WHERE id = ?";
    const startTime = new Date();
    await db.query(query, [content, link.id]);
    const endTime = new Date();
    done++;
    console.log(`+ ${content.length} in ${Util.formatTime(endTime - startTime)} | ${done}/${links.length}`);
}

const semaphore = new Semaphore(100);

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
}

process.exit(0);
