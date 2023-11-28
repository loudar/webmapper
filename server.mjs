import {Scraper} from "./lib/Scraper.mjs";
import express from "express";
import cors from "cors";
import {DB} from "./lib/DB.mjs";
import dotenv from "dotenv";
import path from "path";
import {fileURLToPath} from "url";

dotenv.config();
const app = express();
const port = 3000;

const db_url = process.env.MYSQL_URL.toString();
console.log(`Connecting to database at url ${db_url}...`);
app.use(cors());
app.use(express.json());

const db = new DB(process.env.MYSQL_URL);
await db.connect();

const batchInterval = 500;
const concurrency = 5;
let scraping = false;
let locked = false;
const scraper = new Scraper();

setInterval(async () => {
    if (!scraping) {
        return;
    }
    if (locked) {
        return;
    }
    locked = true;
    await scraper.scrapeSites(db, concurrency);
    locked = false;
}, batchInterval);

app.use((req, res, next) => {
    const debug = process.env.DEBUG === "true";
    if (debug) {
        console.log(`Request: ${req.method} ${req.url}`);
    }
    next();
});

app.get("/api/addSite", async (req, res) => {
    const newUrl = req.query.url;
    console.log(`Adding page ${newUrl}...`);
    const isValidUrl = Scraper.isValidUrl(newUrl);
    if (!isValidUrl) {
        console.log(`Invalid url ${newUrl}.`);
        res.send({});
        return;
    }
    const isDuplicate = await db.getLinkByLink(newUrl);
    if (isDuplicate) {
        console.log(`Duplicate url ${newUrl}.`);
        res.send({});
        return;
    }
    await db.insertLink(newUrl, null, null);
    console.log(`Done adding page ${newUrl}.`);
    res.send({});
});

app.get("/api/getLinks", async (req, res) => {
    console.log("Client requested links...");
    const links = await db.getLinks(true);
    console.log(`Sent ${Object.keys(links).length} links to client.`);
    res.send(links);
});

app.get("/api/getClusters", async (req, res) => {
    console.log("Client requested clusters...");
    const clusters = await db.getClustersWithoutSubdomains();
    console.log(`Sent ${clusters.length} clusters to client.`);
    res.send(clusters);
});

app.get("/api/search", async (req, res) => {
    const query = req.query.query;
    console.log(`Client searched for "${query}"...`);
    const startTime = new Date();
    const linkResults = (await db.searchLinksExplicit(query)).map(r => {
        r.resultType = "link";
        return r;
    });
    const contentResults = (await db.searchContentExplicit(query)).map(r => {
        r.resultType = "content";
        return r;
    });
    const results = [...linkResults, ...contentResults];
    if (results.length < 100) {
        const fuzzyLinkResults = (await db.searchLinksFuzzy(query)).map(r => {
            r.resultType = "linkFuzzy";
            return r;
        });
        const fuzzyContentResults = (await db.searchContentFuzzy(query)).map(r => {
            r.resultType = "contentFuzzy";
            return r;
        });
        results.push(...fuzzyLinkResults, ...fuzzyContentResults)
    }
    const uniqueResults = [];
    const uniqueUrls = [];
    for (const result of results) {
        if (!uniqueUrls.includes(result.link)) {
            uniqueResults.push(result);
            uniqueUrls.push(result.link);
        }
    }
    const endTime = new Date();
    const time = endTime - startTime;
    console.log(`Sent ${uniqueResults.length} results to client.`);
    res.send({
        results: uniqueResults,
        time
    });
});

app.get("/api/getStatistics", async (req, res) => {
    console.log(`Client requested statistics...`);
    const status = await db.getStatistics();
    console.log(`Sent statistics to client.`);
    res.send(status);
});

app.get("/api/getContentStatus", async (req, res) => {
    console.log(`Client requested content status...`);
    const status = await db.getContentStatus();
    console.log(`Sent content status to client.`);
    res.send(status);
});

app.get("/api/startWork", async (req, res) => {
    console.log(`Client requested to start work...`);
    if (scraping) {
        console.log(`Already working, ignoring request.`);
        res.send('Already working');
        return;
    }
    scraping = true;
    res.send('Started');
});

app.get("/api/stopWork", async (req, res) => {
    console.log(`Client requested to stop work...`);
    if (!scraping) {
        console.log(`Not working, ignoring request.`);
        res.send('Not working');
        return;
    }
    scraping = false;
    res.send('Stopped');
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/', express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "web")));

app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening at http://localhost:${port}`)
});