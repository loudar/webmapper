import { parentPort } from 'worker_threads';
import {DB} from "../DB.mjs";
import {Scraper} from "../Scraper.mjs";

parentPort.on("message", async (settings) => {
    const db = new DB(settings.db_url, settings.db_user, settings.db_password);
    await db.connect();
    const scraper = new Scraper();
    scraper.processContent(db, settings.scraperConcurrency, settings.batchSize, settings.excludedTerms).then(() => {
        parentPort.postMessage('DONE');
    });
});