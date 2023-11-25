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
                    searchResultContainer.appendChild(SearchTemplates.resultList(results.results, query));
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

    static resultList(list, query) {
        return FJS.create("div")
            .classes("search-results", "flex-v")
            .children(...list.map(entry => {
                return SearchTemplates.resultEntry(entry, query);
            }))
            .build();
    }

    static resultEntry(entry, query) {
        return FJS.create("a")
            .classes("search-result-link")
            .attributes("href", entry.link, "target", "_blank")
            .children(
                FJS.create("div")
                    .classes("search-result", "flex-v", "padded", "rounded")
                    .children(
                        FJS.create("span")
                            .classes("search-result-link")
                            .text(entry.link)
                            .build(),
                        SearchTemplates.preview(entry.preview, query)
                    ).build()
            ).build();
    }

    static preview(text, query) {
        text = "..." + text + "...";
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
        let spanElements = parts.map((part) => {
            return FJS.create("span")
                .classes(part.toLowerCase() === query.toLowerCase() ? 'highlight' : '_', 'search-result-preview-part')
                .text(part)
                .build();
        });

        return FJS.create("div")
            .classes("search-result-content", "text-small")
            .children(...spanElements)
            .build();
    }
}