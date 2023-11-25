import {DB} from "../lib/DB.mjs";
import dotenv from "dotenv";
import {Util} from "../lib/Util.mjs";
import {HtmlCleaner} from "../lib/HtmlCleaner.mjs";

dotenv.config();
const db = new DB("data.targoninc.com");
await db.connect();

const query = `SELECT * FROM links WHERE content IS NOT NULL`;
const links = await db.query(query);
let done = 0;
let jobs = [];
const percentages = [];

async function jobFunction(link, index) {
    console.log(`-> ${link.link} (${index}/${links.length})`);
    let raw = link.content;
    let content = HtmlCleaner.clean(raw);
    const newLength = content ? content.length : 0;
    console.log(`... ${newLength} | ${done}/${links.length}`)
    const query = "UPDATE links SET content = ? WHERE id = ?";
    const startTime = new Date();
    await db.query(query, [content, link.id]);
    const endTime = new Date();
    const percentChanged = Math.round((newLength - raw.length) / raw.length * 100);
    percentages.push(percentChanged);
    console.log(`~ ${newLength} in ${Util.formatTime(endTime - startTime)} | ${done}/${links.length} | ${percentChanged}%`);
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
await Promise.all(jobs);

const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
console.log(`Average percent change: ${average}%`);

process.exit(0);
