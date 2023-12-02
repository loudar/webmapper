import {FJS, FjsObservable} from "@targoninc/fjs";
import {Auth} from "../Auth.mjs";
import {GenericTemplates} from "./GenericTemplates.mjs";
import {Api} from "../Api.mjs";

export class PageTemplates {
    static cluster() {
        return FJS.create("div")
            .attributes("id", "graph")
            .children(
                FJS.create("div")
                    .attributes("class", "loading")
                    .build(),
                FJS.create("span")
                    .text("This feature has been temporarily disabled.")
                    .build()
            ).build();
    }

    static stats() {
        return FJS.create("div")
            .classes("stats-container")
            .children(
                FJS.create("div")
                    .id("statistics")
                    .classes("flex-v", "padded")
                    .build(),
                FJS.create("div")
                    .id("content-status")
                    .classes("flex-v", "padded")
                    .build()
            ).build();
    }

    static search(user) {
        let userElements = [];
        if (user) {
            userElements = [GenericTemplates.simpleLink(user.username, "/profile")];
        } else {
            userElements = [GenericTemplates.simpleLink("Login", "/login")];
        }

        return FJS.create("div")
            .id("search-container")
            .classes("flex-v", "padded")
            .children(
                ...userElements,
                FJS.create("div")
                    .id("content-status")
                    .build(),
                FJS.create("div")
                    .classes("flex")
                    .id("search-bar")
                    .build(),
                FJS.create("div")
                    .classes("flex")
                    .id("search-suggestions")
                    .build(),
                FJS.create("div")
                    .id("search-loading")
                    .build(),
                FJS.create("div")
                    .id("search-results")
                    .classes("flex-v", "padded", "rounded")
                    .build(),
            ).build();
    }

    static async profile(router, user) {
        let actionElements = [];
        if (user.admin === 1) {
            const runningProcesses = await Api.isWorking("all");
            const workingState = new FjsObservable(runningProcesses);
            const linkerActionTextState = new FjsObservable(runningProcesses.linker ? "Stop linking" : "Start linking");
            const scraperActionTextState = new FjsObservable(runningProcesses.scraper ? "Stop scraping" : "Start scraping");
            workingState.onUpdate = (value) => {
                linkerActionTextState.value = value.linker ? "Stop linking" : "Start linking";
                scraperActionTextState.value = value.scraper ? "Stop scraping" : "Start scraping";
            };
            actionElements = [
                GenericTemplates.actionButton(linkerActionTextState, async () => {
                    if (workingState.value.linker) {
                        await Api.stopWork("linker");
                    } else {
                        await Api.startWork("linker");
                    }
                    workingState.value = {
                        linker: !workingState.value.linker,
                        scraper: workingState.value.scraper
                    };
                }),
                GenericTemplates.actionButton(scraperActionTextState, async () => {
                    if (workingState.value.scraper) {
                        await Api.stopWork("scraper");
                    } else {
                        await Api.startWork("scraper");
                    }
                    workingState.value = {
                        linker: workingState.value.linker,
                        scraper: !workingState.value.scraper
                    };
                }),
            ];
        }

        return FJS.create("div")
            .classes("flex-v", "padded")
            .children(
                GenericTemplates.simpleLink("Search", "/search"),
                FJS.create("div")
                    .classes("flex")
                    .children(
                        ...actionElements,
                    ).build(),
                FJS.create("span")
                    .text("username: " + user.username)
                    .build(),
                FJS.create("span")
                    .text("created: " + user.created_at)
                    .build(),
                FJS.create("span")
                    .text("updated: " + user.updated_at)
                    .build(),
                FJS.create("button")
                    .text("Logout")
                    .onclick(async () => {
                        await Auth.logout();
                        router.navigate("login");
                    }).build()
            )
            .build();
    }
}