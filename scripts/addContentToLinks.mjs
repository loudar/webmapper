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
    "crunchbase",
    ".mp4",
    "aka.ms"
];
let excludeQuery = excludeTerms.map(() => `link NOT LIKE ?`).join(' AND ');
let bindVariables = excludeTerms.map(term => `%${term}%`);
const query = `SELECT * FROM links WHERE status = 200 AND content IS NULL AND ${excludeQuery} LIMIT 5000`;
let links = await db.query(query, bindVariables);
let done = 0;
let jobs = [];

const scraper = new Scraper();

async function saveContentToLink(content, link) {
    const query = "UPDATE links SET content = ? WHERE id = ?";
    const startTime = new Date();
    await db.query(query, [content, link.id]);
    const endTime = new Date();
    done++;
    console.log(`+ ${content.length} in ${Util.formatTime(endTime - startTime)} | ${done}/${links.length}`);
}

async function jobFunction(link, index) {
    console.log(`-> ${link.link} (${index}/${links.length})`);
    const linkHost = Util.getHost(link.link);
    const res = await scraper.getPage(linkHost, link.link);
    if (res.isFileDownload) {
        console.log(`Skipping ${link.link} because it's a file download.`);
        done++;
        await saveContentToLink("[download]", link);
        return;
    }
    if (!res.data) {
        done++;
        console.error(`Failed to get content for ${link.link} (${done}/${links.length})`);
        await saveContentToLink("[nocontent]", link);
        return;
    }
    let content = HtmlCleaner.clean(res.data);
    if (content.length === 0) {
        console.log(`Skipping ${link.link} because it's too short.`);
        done++;
        await saveContentToLink("[shortcontent]", link);
        return;
    }
    const limitMb = 5;
    if (content.length > limitMb * 1024 * 1024) {
        const percentOver = Math.round((content.length - limitMb * 1024 * 1024) / (limitMb * 1024 * 1024) * 100);
        console.log(`Skipping ${link.link} because it's too long (${content.length}, +${percentOver}).`);
        done++;
        await saveContentToLink("[longcontent]", link);
        return;
    }
    await saveContentToLink(content, link);
}

const semaphore = new Semaphore(10);

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
