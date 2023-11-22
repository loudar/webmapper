import mysql from 'mysql2/promise';
import {Scraper} from "./Scraper.mjs";

export class DB {
    constructor(host, port = null, user = null, password = null, database = "webmap") {
        this.host = host;
        this.port = port || 3306;
        this.user = user || process.env.MYSQL_USER;
        this.password = password || process.env.MYSQL_PASSWORD;
        this.database = database;
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: this.host,
            port: this.port,
            user: this.user,
            password: this.password,
            database: this.database
        });
    }

    async close() {
        await this.connection.end();
    }

    async query(sql, params) {
        const [rows] = await this.connection.execute(sql, params);
        return rows;
    }

    async insertLink(link) {
        const host = Scraper.getHost(link);
        try {
            await this.query("INSERT INTO links (link, host) VALUES (?, ?)", [link, host]);
        } catch (e) {
            if (e.code === "ER_DUP_ENTRY") {
                return;
            }
            console.log(`Failed to insert link ${link} with host ${host}: ${e}`);
        }
    }

    async getLinksByHost(host) {
        const rows = await this.query("SELECT link FROM links WHERE host = ?", [host]);
        return rows.map(row => row.link);
    }

    async linkExists(link) {
        const rows = await this.query("SELECT * FROM links WHERE link = ?", [link]);
        return rows.length > 0;
    }

    async getLinkId(link) {
        const rows = await this.query("SELECT id FROM links WHERE link = ?", [link]);
        if (rows.length === 0) {
            await this.insertLink(link);
            return this.getLinkId(link);
        }
        return rows[0].id;
    }

    async linkLinks(originLink, targetLink) {
        const originId = await this.getLinkId(originLink);
        const targetId = await this.getLinkId(targetLink);
        try {
            await this.query("INSERT INTO links_linked (origin_id, target_id) VALUES (?, ?)", [originId, targetId]);
        } catch (e) {
            if (e.code === "ER_DUP_ENTRY") {
                return;
            }
            console.log(`Failed to link ${originLink} to ${targetLink}: ${e}`);
        }
    }

    async getLinkById(id) {
        const rows = await this.query("SELECT link FROM links WHERE id = ?", [id]);
        return rows[0].link;
    }

    async getOutgoingLinks(link) {
        const originId = await this.getLinkId(link);
        const rows = await this.query("SELECT target_id FROM links_linked WHERE origin_id = ?", [originId]);
        return rows.map(async row => await this.getLinkById(row.target_id));
    }

    async getIncomingLinks(link) {
        const targetId = await this.getLinkId(link);
        const rows = await this.query("SELECT origin_id FROM links_linked WHERE target_id = ?", [targetId]);
        return rows.map(async row => await this.getLinkById(row.origin_id));
    }

    getUnprocessedLinks() {
        return this.query("SELECT * FROM links WHERE id NOT IN (SELECT origin_id FROM links_linked)");
    }

    async getLinks(debug = false) {
        const baseLinks = await this.query("SELECT * FROM links");
        const links = {};
        if (debug) console.log(`Got ${baseLinks.length} links from DB.`);
        const outLinks = await this.getAllOutgoingLinks();
        if (debug) console.log(`Got ${outLinks.length} outgoing links from DB.`);
        let i = 0;
        let previousPercent = 0;
        for (const outLink of outLinks) {
            i++;
            const origin = baseLinks.find(row => row.id === outLink.originId);
            if (!origin) {
                console.error(`Failed to find origin link with ID ${outLink.originId}`);
                continue;
            }
            const originLink = origin.link;
            const targetLink = outLink.targetLink;
            if (!links[originLink]) {
                links[originLink] = [];
            }
            if (!links[originLink].includes(targetLink)) {
                links[originLink].push(targetLink);
            }
            const percent = Math.floor(i / outLinks.length * 100);
            if (debug && percent % 10 === 0 && percent !== previousPercent) console.log(`Processed ${i} links. ${percent}% complete.`);
            previousPercent = percent;
        }
        return links;
    }

    async getOutgoingLinksById(id) {
        const rows = await this.query("SELECT target_id FROM links_linked WHERE origin_id = ?", [id]);
        return rows.map(async row => await this.getLinkById(row.target_id));
    }

    async getAllOutgoingLinks() {
        const rows = await this.query("SELECT origin_id, target_id, l.link FROM links_linked INNER JOIN links l ON links_linked.target_id = l.id");
        return rows.map(row => {
            return {
                originId: row.origin_id,
                targetLink: row.link
            }
        });
    }
}