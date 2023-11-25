import {DB} from "../lib/DB.mjs";
import {Scraper} from "../lib/Scraper.mjs";
import dotenv from "dotenv";
import {Util} from "../lib/Util.mjs";

dotenv.config();
const db = new DB(process.env.MYSQL_URL);
await db.connect();

const query = "SELECT * FROM links WHERE status IS NULL";
const links = await db.query(query);
let done = 0;
const jobs = [];

const scraper = new Scraper();
async function jobFunction(link, index) {
    const linkHost = Util.getHost(link.link);
    const res = await scraper.getPage(linkHost, link.link);
    console.log(`Updating ${link.link} (${index}/${links.length}) with code ${res.status}...`);
    await db.updateLinkStatus(link.link, res.status);
}

for (const link of links) {
    if (jobs.length < 100) {
        const index = done + jobs.length;
        jobs.push(jobFunction(link, index));
    } else {
        await Promise.any(jobs);
        done += jobs.length;
        jobs.length = 0;
    }
}
