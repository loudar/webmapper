import {createRouter} from "router5";
import browserPlugin from 'router5-plugin-browser';
import {Page} from "./Page.mjs";
import {PageTemplates} from "./Templates/PageTemplates.mjs";

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
    if (route.previousRoute && route.route.name === route.previousRoute.name) {
        return;
    }
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
            //document.body.appendChild(PageTemplates.profile());
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