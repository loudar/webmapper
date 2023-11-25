import {Scraper} from "./lib/Scraper.mjs";
import express from "express";
import cors from "cors";
import {DB} from "./lib/DB.mjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
const app = express();
const port = 3000;

const db_url = process.env.MYSQL_URL.toString();
console.log(`Connecting to database at url ${db_url}...`);
const origin = db_url === "data.targoninc.com" ? "http://localhost:3000" : "https://smallgoogle.com";
console.log(`Using origin ${origin}...`);
app.use(cors({ origin }));

const db = new DB(process.env.MYSQL_URL);
await db.connect();
const scraper = new Scraper();

app.get("/addSite", async (req, res) => {
    const newUrl = req.query.url;
    const onlyNew = req.query.new === "true";
    console.log(`Adding links for page ${newUrl} to client...`);
    await Scraper.scrapeSites(db, scraper, newUrl, onlyNew);
    console.log(`Done adding links for page ${newUrl}.`);
    res.send({});
});
app.get("/getLinks", async (req, res) => {
    console.log("Client requested links...");
    const links = await db.getLinks(true);
    console.log(`Sent ${Object.keys(links).length} links to client.`);
    res.send(links);
});
app.get("/getClusters", async (req, res) => {
    console.log("Client requested clusters...");
    const clusters = await db.getClustersWithoutSubdomains();
    console.log(`Sent ${clusters.length} clusters to client.`);
    res.send(clusters);
});

app.get("/search", async (req, res) => {
    const query = req.query.query;
    console.log(`Client searched for "${query}"...`);
    const startTime = new Date();
    const linkResults = await db.searchLinksExplicit(query);
    const contentResults = await db.searchContentExplicit(query);
    const results = [...linkResults, ...contentResults];
    if (results.length < 100) {
        const fuzzyLinkResults = await db.searchLinksFuzzy(query);
        const fuzzyContentResults = await db.searchContentFuzzy(query);
        results.push(...fuzzyLinkResults, ...fuzzyContentResults);
    }
    const endTime = new Date();
    const time = endTime - startTime;
    console.log(`Sent ${results.length} results to client.`);
    res.send({
        results,
        time
    });
});

app.get("/contentStatus", async (req, res) => {
    console.log(`Client requested content status...`);
    const status = await db.getContentStatus();
    console.log(`Sent content status to client.`);
    res.send(status);
});

const dirname = path.resolve();
app.use('/', express.static(path.join(dirname, "dist")));
app.use(express.static(path.join(dirname, "web")));

app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening at http://localhost:${port}`)
});