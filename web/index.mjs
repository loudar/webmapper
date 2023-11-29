import {createRouter} from "router5";
import browserPlugin from 'router5-plugin-browser';
import {Page} from "./Page.mjs";
import {PageTemplates} from "./Templates/PageTemplates.mjs";
import {Auth} from "./Auth.mjs";
import {UserTemplates} from "./Templates/UserTemplates.mjs";

const routes = [
    { name: 'stats', path: '/stats' },
    { name: 'cluster', path: '/cluster' },
    { name: 'profile', path: '/profile' },
    { name: 'search', path: '/search' },
];

const router = createRouter(routes, {
    defaultRoute: 'search',
});
router.usePlugin(browserPlugin());

router.subscribe(async (route) => {
    switch (route.route.name) {
        case "stats":
            document.body.innerHTML = "";
            document.body.appendChild(PageTemplates.stats());
            Page.stats();
            break;
        case "cluster":
            document.body.innerHTML = "";
            document.body.appendChild(PageTemplates.cluster());
            Page.cluster();
            break;
        case "profile":
            document.body.innerHTML = "";
            const user = await Auth.user();
            if (user === null) {
                document.body.appendChild(UserTemplates.login(router));
                break;
            } else {
                document.body.appendChild(PageTemplates.profile(router, user));
            }
            break;
        case "search":
            document.body.innerHTML = "";
            document.body.appendChild(PageTemplates.search());
            await Page.search(route.route.params.query || "");
            break;
        default:
            document.body.innerHTML = "";
            document.body.appendChild(PageTemplates.search());
            await Page.search(route.route.params.query || "");
            break;
    }
});

router.start();