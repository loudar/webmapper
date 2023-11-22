import {Scraper} from "./lib/Scraper.mjs";
import express from "express";
import cors from "cors";
import {DB} from "./lib/DB.mjs";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = 3000;

app.use(cors({ origin: 'http://localhost:3334' }));

const db = new DB("data.targoninc.com");
await db.connect();

app.get("/addSite", async (req, res) => {
    const newUrl = req.query.url;
    console.log(`Adding links for page ${newUrl} to client...`);
    await Scraper.scrapeSites(db, newUrl);
    console.log(`Done adding links for page ${newUrl}.`);
    res.send({});
});
app.get("/getLinks", async (req, res) => {
    console.log("Client requested links...");
    const links = await db.getLinks(true);
    console.log(`Sent ${Object.keys(links).length} links to client.`);
    res.send(links);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening at http://localhost:${port}`);
});