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
const query = `SELECT * FROM links WHERE status = 200 AND content IS NULL AND ${excludeQuery} LIMIT 5000`;
let links = await db.query(query, bindVariables);
let total = links.length;
let done = 0;
let jobs = [];

const scraper = new Scraper();

async function saveContentToLink(content, link) {
    if (!content) {
        content = "[nocontent]";
    }
    const query = "UPDATE links SET content = ? WHERE id = ?";
    try {
        await db.query(query, [content, link.id]);
    } catch (e) {
        console.error(`Failed to save content for ${link.id} (${link.link}) with ${content}: ${e}`);
        throw e;
    }
    done++;
}

async function jobFunction(link, index) {
    console.log(`-> ${link.link} (${index}/${total})`);
    const linkHost = Util.getHost(link.link);
    const res = await scraper.getPage(linkHost, link.link);
    if (res.isFileDownload) {
        await saveContentToLink("[download]", link);
        console.log(`Skipping ${link.link} because it's a file download. (${done}/${total})`);
        return;
    }
    if (!res.data) {
        await saveContentToLink("[nocontent]", link);
        console.error(`Failed to get content for ${link.link} (${done}/${total})`);
        return;
    }
    let content = HtmlCleaner.clean(res.data);
    if (content && content.length === 0) {
        await saveContentToLink("[shortcontent]", link);
        console.log(`Skipping ${link.link} because it's too short. (${done}/${total})`);
        return;
    }
    const limitMb = 5;
    if (content && content.length > limitMb * 1024 * 1024) {
        const percentOver = Math.round((content.length - limitMb * 1024 * 1024) / (limitMb * 1024 * 1024) * 100);
        await saveContentToLink("[longcontent]", link);
        console.log(`Skipping ${link.link} because it's too long (${content.length}, +${percentOver}). (${done}/${total})`);
        return;
    }
    const startTime = new Date();
    await saveContentToLink(content, link);
    const endTime = new Date();
    console.log(`+ ${content ? content.length : 0} in ${Util.formatTime(endTime - startTime)} | ${done}/${total}`);
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
    total += links.length;
}

process.exit(0);
