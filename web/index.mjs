import {createRouter} from "router5";
import browserPlugin from 'router5-plugin-browser';
import {Page} from "./Page.mjs";
import {PageTemplates} from "./Templates/PageTemplates.mjs";
import {Auth} from "./Auth.mjs";
import {UserTemplates} from "./Templates/UserTemplates.mjs";

const routes = [
    { name: 'stats', path: '/stats' },
    { name: 'cluster', path: '/cluster' },
    { name: 'login', path: '/login' },
    { name: 'profile', path: '/profile' },
    { name: 'search', path: '/search' },
];

const router = createRouter(routes, {
    defaultRoute: 'search',
});
router.usePlugin(browserPlugin());

router.subscribe(async (route) => {
    document.body.innerHTML = "";
    const user = await Auth.user();
    switch (route.route.name) {
        case "stats":
            document.body.appendChild(PageTemplates.stats());
            Page.stats();
            break;
        case "cluster":
            document.body.appendChild(PageTemplates.cluster());
            Page.cluster();
            break;
        case "login":
            if (user !== null) {
                router.navigate("profile");
                break;
            }
            document.body.appendChild(UserTemplates.login(router));
            break;
        case "profile":
            if (user === null) {
                router.navigate("login");
                break;
            }
            document.body.appendChild(PageTemplates.profile(router, user));
            break;
        case "search":
            document.body.appendChild(PageTemplates.search(user));
            await Page.search(route.route.params.query || "");
            break;
        default:
            document.body.appendChild(PageTemplates.search());
            await Page.search(route.route.params.query || "");
            break;
    }
});

router.start();