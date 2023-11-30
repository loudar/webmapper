import {FJS} from "@targoninc/fjs";
import {Auth} from "../Auth.mjs";

export class PageTemplates {
    static cluster() {
        return FJS.create("div")
            .attributes("id", "graph")
            .children(
                FJS.create("div")
                    .attributes("class", "loading")
                    .build()
            ).build();
    }

    static stats() {
        return FJS.create("div")
            .styles("max-width", "1200px", "margin", "0 auto")
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

    static search() {
        return FJS.create("div")
            .id("search-container")
            .classes("flex-v", "padded")
            .children(
                FJS.create("div")
                    .id("content-status")
                    .build(),
                FJS.create("div")
                    .classes("flex")
                    .id("search-bar")
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

    static profile(router, user) {
        return FJS.create("div")
            .classes("flex-v")
            .children(
                FJS.create("span")
                    .text("username: " + user.username)
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