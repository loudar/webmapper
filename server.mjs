import {Scraper} from "./lib/Scraper.mjs";
import express from "express";

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
    const newUrl = req.query.url;
    const data = await Scraper.addLinks(newUrl);
    console.log(`Sent ${Object.keys(data).length} links to client.`);
    res.send(data);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});