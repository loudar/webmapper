import {DB} from "../lib/DB.mjs";
import {Scraper} from "../lib/Scraper.mjs";
import dotenv from "dotenv";
import {Util} from "../lib/Util.mjs";
import {HtmlCleaner} from "../lib/HtmlCleaner.mjs";

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
    "twitter"
];
let excludeQuery = excludeTerms.map(() => `link NOT LIKE ?`).join(' AND ');
let bindVariables = excludeTerms.map(term => `%${term}%`);
const query = `SELECT * FROM links WHERE content IS NULL AND ${excludeQuery} LIMIT 500`;
const links = await db.query(query, bindVariables);
let done = 0;
let jobs = [];

const scraper = new Scraper();
async function jobFunction(link, index) {
    console.log(`-> ${link.link} (${index}/${links.length})`);
    const linkHost = Util.getHost(link.link);
    const res = await scraper.getPage(linkHost, link.link);
    let content = res.data;
    if (!content) {
        console.error(`Failed to get content for ${link.link} (${done}/${links.length})`);
        return;
    }
    content = HtmlCleaner.clean(content);
    const query = "UPDATE links SET content = ? WHERE id = ?";
    const startTime = new Date();
    await db.query(query, [content, link.id]);
    const endTime = new Date();
    console.log(`+ ${content.length} in ${Util.formatTime(endTime - startTime)} | ${done}/${links.length}`);
    done++;
}

let i = 0;
for (const link of links) {
    i++;
    if (jobs.length < 100) {
        jobs.push(jobFunction(link, i));
    } else {
        await Promise.all(jobs);
        jobs = [];
        jobs.push(jobFunction(link, i));
    }
}

process.exit(0);
