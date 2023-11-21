import {Scraper} from "./lib/Scraper.mjs";
import express from "express";
import fs from "fs";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors({ origin: 'http://localhost:3334' }));

app.get("/addSite", async (req, res) => {
    const newUrl = req.query.url;
    console.log(`Adding links for page ${newUrl} to client...`);
    const data = await Scraper.scrapeSites(newUrl);
    console.log(`Sent ${Object.keys(data).length} links to client.`);
    res.send(data);
});
app.get("/getLinks", async (req, res) => {
    console.log("Sending links to client...");
    const file = "links.json";
    const fileContent = fs.readFileSync(file);
    const data = JSON.parse(fileContent.toString());
    console.log(`Sent ${Object.keys(data).length} links to client.`);
    res.send(data);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening at http://localhost:${port}`);
});