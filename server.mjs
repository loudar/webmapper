import {Scraper} from "./lib/Scraper.mjs";
import express from "express";
import cors from "cors";
import {DB} from "./lib/DB.mjs";
import dotenv from "dotenv";
import path from "path";
import {fileURLToPath} from "url";
import passport from "passport";
import session from "express-session";
import bcrypt from "bcryptjs";
import passportLocal from "passport-local";import rateLimit from "express-rate-limit";

const LocalStrategy = passportLocal.Strategy;

dotenv.config();
const app = express();
const port = 3000;
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many requests from this IP, please try again after a minute"
});

app.use(limiter);

const db_url = process.env.MYSQL_URL.toString();
console.log(`Connecting to database at url ${db_url}...`);
app.use(cors());
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    async (username, password, done) => {
        const user = await db.getUserByUsername(username);
        if (!user) {
            return done(null, false, {message: "Incorrect username."});
        }
        if (!bcrypt.compareSync(password, user.password)) {
            return done(null, false, {message: "Incorrect password."});
        }
        return done(null, user);
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await db.getUserById(id);
    done(null, user);
});

const db = new DB(process.env.MYSQL_URL);
await db.connect();

const batchInterval = 500;
const batchSize = 10;
const concurrency = 3;
let scraping = false;
let locked = false;
const scraper = new Scraper();
const excludedTerms = ["linkedin", "microsoft", "bing"];

setInterval(async () => {
    if (!scraping) {
        return;
    }
    if (locked) {
        return;
    }
    locked = true;
    await scraper.scrapeSites(db, concurrency, batchSize, excludedTerms);
    locked = false;
}, batchInterval);

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.send({error: "Not authenticated"});
}

app.use((req, res, next) => {
    const debug = process.env.DEBUG === "true";
    if (debug) {
        console.log(`Request: ${req.method} ${req.url}`);
    }
    next();
});

app.post("/api/authorize", async (req, res, next) => {
    const existing = await db.getUserByUsername(req.body.username);
    if (!existing) {
        const hashedPassword = bcrypt.hashSync(req.body.password, 10);
        await db.insertUser(req.body.username, hashedPassword);
    }

    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.log(err);
            return next(err);
        }
        if (!user) {
            return res.send({error: "Invalid username or password"});
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            const outUser = {
                id: user.id,
                username: user.username,
            };
            if (!existing) {
                outUser.justRegistered = true;
            }
            return res.send({
                user: outUser
            });
        });
    })(req, res, next);
});

app.post("/api/logout", (req, res) => {
    req.logout(() => {
        const isHttps = req.headers['x-forwarded-proto'] === 'https';

        res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: isHttps,
            sameSite: 'none'
        });

        res.send({message: "User has been successfully logged out."});
    });
});

app.get("/api/isAuthorized", (req, res) => {
    if (req.isAuthenticated()) {
        res.send({user: req.user});
        return;
    }
    res.send({});
});

app.get("/api/addSite", checkAuthenticated, async (req, res) => {
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

app.get("/api/getSuggestions", async (req, res) => {
    const query = req.query.query;
    const user = req.user;
    let searches = [];
    if (user) {
        const userSearches = await db.getUserSearches(user.id, query);
        searches = userSearches.map(s => {
            s.userQuery = true;
            delete s.user_id;
            delete s.search_id;
            return s;
        }) ?? [];
    }
    const allSearches = await db.getSearches(query);
    searches = searches.concat(allSearches.map(s => {
        s.userQuery = false;
        delete s.user_id;
        delete s.search_id;
        return s;
    }));
    res.send(searches);
});

app.get("/api/search", async (req, res) => {
    const query = req.query.query;
    const user = req.user;
    if (user) {
        console.log(`User ${user.username} requested search for ${query}...`);
        await db.insertSearch(user.id, query);
    } else {
        console.log(`Client requested search for ${query}...`);
    }
    const startTime = new Date();
    let contentResults;
    try {
        contentResults = (await db.searchExplicit(query)).sort((a, b) => {
            return b.relevance - a.relevance;
        });
    } catch (e) {
        console.error(e);
        res.send({
            results: [],
            time: 0
        });
        return;
    }
    const maxRelevance = Math.max(...contentResults.map(result => result.relevance));
    const results = contentResults.map(result => {
        result.relevance = result.relevance / maxRelevance;
        return result;
    });
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

app.get("/api/startWork", checkAuthenticated, async (req, res) => {
    console.log(`Client requested to start work...`);
    if (scraping) {
        console.log(`Already working, ignoring request.`);
        res.send("Already working");
        return;
    }
    scraping = true;
    res.send("Started");
});

app.get("/api/stopWork", checkAuthenticated, async (req, res) => {
    console.log(`Client requested to stop work...`);
    if (!scraping) {
        console.log(`Not working, ignoring request.`);
        res.send("Not working");
        return;
    }
    scraping = false;
    res.send("Stopped");
});

app.get("/api/addExcludedTerm", checkAuthenticated, async (req, res) => {
    const term = req.query.term;
    console.log(`Client requested to add excluded term ${term}...`);
    if (excludedTerms.includes(term)) {
        console.log(`Term ${term} already excluded, ignoring request.`);
        res.send("Already excluded");
        return;
    }
    excludedTerms.push(term);
    res.send("Added");
});

app.get("/api/removeExcludedTerm", checkAuthenticated, async (req, res) => {
    const term = req.query.term;
    console.log(`Client requested to remove excluded term ${term}...`);
    if (!excludedTerms.includes(term)) {
        console.log(`Term ${term} not excluded, ignoring request.`);
        res.send("Not excluded");
        return;
    }
    excludedTerms.splice(excludedTerms.indexOf(term), 1);
    res.send("Removed");
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/", express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "web")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Example app listening at http://localhost:${port}`)
});