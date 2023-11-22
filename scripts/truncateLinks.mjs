import {DB} from "../lib/DB.mjs";
import fs from "fs";

const db = new DB("data.targoninc.com");
await db.connect();

const query = "SELECT * FROM links WHERE link LIKE '%/'";
const links = await db.query(query);
let done = 0;
for (const oldLink of links) {
    const newLink = oldLink.link.substring(0, oldLink.link.length - 1);
    console.log(`Updating ${oldLink.link} to ${newLink} (${done + 1}/${links.length})...`);
    try {
        await db.query("UPDATE links SET link = ? WHERE id = ?", [newLink, oldLink.id]);
        console.log(`Updated ${oldLink.link} to ${newLink}`);
    } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
            console.log(`Rereferencing ${oldLink.link} to ${newLink}...`);
            const incomingLinks = await db.getIncomingLinks(oldLink.link);
            const outgoingLinks = await db.getOutgoingLinks(oldLink.link);
            console.log(`Found ${incomingLinks.length} incoming links and ${outgoingLinks.length} outgoing links.`);
            for (const incomingLink of incomingLinks) {
                await db.linkLinks(incomingLink, newLink);
            }
            for (const outgoingLink of outgoingLinks) {
                await db.linkLinks(newLink, outgoingLink);
            }
            await db.query("DELETE FROM links WHERE id = ?", [oldLink.id]);
            console.log(`Updated ${oldLink.link} to ${newLink}`);
        }
    }
    done++;
}
console.log(`Done updating ${done} links.`);