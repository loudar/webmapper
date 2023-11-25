import {FJS} from "@targoninc/fjs";
import {Util} from "../../lib/Util.mjs";
import {Api} from "../Api.mjs";

export class SearchTemplates {
    static input() {
        return FJS.create("input")
            .classes("search-input")
            .attributes("type", "text", "placeholder", "Search")
            .onchange(async (e) => {
                const query = e.target.value;
                if (query.length > 0) {
                    const loadingContainer = document.querySelector('#search-loading');
                    loadingContainer.innerHTML = "";
                    loadingContainer.appendChild(SearchTemplates.loading());
                    const results = await Api.search(query);
                    loadingContainer.innerHTML = "";
                    const searchResultContainer = document.querySelector('#search-results');
                    searchResultContainer.innerHTML = "";
                    searchResultContainer.appendChild(SearchTemplates.time(results.results.length, results.time));
                    searchResultContainer.appendChild(SearchTemplates.resultList(results.results));
                }
            })
            .build();
    }

    static loading() {
        return FJS.create("div")
            .classes("search-loading")
            .children(
                FJS.create("div")
                    .classes("search-loading-spinner")
                    .build(),
                FJS.create("div")
                    .classes("search-loading-text")
                    .text("Searching...")
                    .build()
            ).build();
    }

    static time(resultCount, time) {
        return FJS.create("div")
            .classes("search-time", "text-small")
            .text(`Found ${resultCount} results in ${Util.formatTime(time)}`)
            .build();
    }

    static resultList(list) {
        return FJS.create("div")
            .classes("search-results", "flex-v")
            .children(...list.map(entry => {
                return SearchTemplates.resultEntry(entry);
            }))
            .build();
    }

    static resultEntry(entry) {
        return FJS.create("div")
            .classes("search-result", "flex-v", "padded")
            .children(
                FJS.create("a")
                    .classes("search-result-link")
                    .attributes("href", entry.link)
                    .text(entry.link)
                    .build(),
                FJS.create("div")
                    .classes("search-result-content", "text-small")
                    .text(entry.preview)
                    .build()
            ).build();
    }
}