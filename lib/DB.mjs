import mysql from 'mysql2/promise';
import {Util} from "./Util.mjs";

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

    async insertLink(link, status) {
        const host = Util.getHost(link);
        try {
            await this.query("INSERT INTO links (link, status, host) VALUES (?, ?, ?)", [link, status, host]);
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
            await this.insertLink(link, null);
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
        return await Promise.all(rows.map(async row => await this.getLinkById(row.target_id)));
    }

    async getIncomingLinks(link) {
        const targetId = await this.getLinkId(link);
        const rows = await this.query("SELECT origin_id FROM links_linked WHERE target_id = ?", [targetId]);
        return await Promise.all(rows.map(row => this.getLinkById(row.origin_id)));
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

    async updateLinkStatus(link, status) {
        await this.query("UPDATE links SET status = ? WHERE link = ?", [status, link]);
    }

    async getClusters() {
        const rows = await this.query(`SELECT
    links.host,
    COUNT(ll.target_id) AS outgoing_link_count,
    GROUP_CONCAT(DISTINCT CONCAT(l2.host, '(', coalesce(l2.incoming_link_count, 0), ')')) AS target_hosts
FROM
    links
LEFT JOIN
    links_linked ll ON links.id = ll.origin_id
LEFT JOIN
    (SELECT
         l2.id,
         l2.host,
         COUNT(ll2.origin_id) as incoming_link_count
     FROM
         links AS l2
     LEFT JOIN
         links_linked ll2 ON l2.id = ll2.target_id
     GROUP BY
         l2.id, l2.host) AS l2 ON ll.target_id = l2.id
GROUP BY
    links.host
ORDER BY
    outgoing_link_count DESC`);
        return rows.map(row => {
            return {
                host: row.host,
                outgoingLinkCount: row.outgoing_link_count,
                targetHosts: row.target_hosts ? row.target_hosts.split(",").map(targetHost => {
                    const [host, incomingLinkCount] = targetHost.split("(");
                    return {
                        host,
                        incomingLinkCount: parseInt(incomingLinkCount.substring(0, incomingLinkCount.length - 1))
                    }
                }) : []
            }
        });
    }
}