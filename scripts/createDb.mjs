import {DB} from "../lib/DB.mjs";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const db = new DB(process.env.MYSQL_URL);
await db.connect();

const createSql = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "create.sql"), "utf8");
await db.query(createSql);
