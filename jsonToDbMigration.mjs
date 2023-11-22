import {DB} from "./lib/DB.mjs";
import fs from "fs";

const db = new DB("data.targoninc.com");
await db.connect();

const filename = "links.json";
const fileContent = fs.readFileSync(filename);
const data = JSON.parse(fileContent.toString());
const links = Object.entries(data);

let i = 0;
for (const [url, linkList] of links) {
    await db.insertLink(url);
    for (const link of linkList) {
        await db.insertLink(link);
        await db.linkLinks(url, link);
    }
    i++;
    const percentDone = Math.floor(100 * (i / links.length));
    console.log(`Wrote ${linkList.length} links to DB for ${url}. | ${percentDone}%`);
}
