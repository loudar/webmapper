import {FJS} from "@targoninc/fjs";
import {Util} from "../../lib/Util.mjs";
import {SearchAdapter} from "../SearchAdapter.mjs";

export class SearchTemplates {
    static input() {
        let lastSuggestionTime = 0;
        return FJS.create("input")
            .classes("search-input")
            .attributes("type", "text", "placeholder", "Search")
            .onchange(async (e) => {
                const query = e.target.value;
                if (query.length > 0) {
                    await SearchAdapter.search(query);
                } else {
                    window.history.pushState({}, "");
                    const searchResultContainer = document.querySelector('#search-results');
                    searchResultContainer.innerHTML = "";
                }
            })
            .oninput(async (e) => {
                const query = e.target.value;
                const now = new Date();
                if (now - lastSuggestionTime < 300) {
                    return;
                }
                if (query.length > 0) {
                    await SearchAdapter.suggest(query);
                    lastSuggestionTime = now;
                } else {
                    const searchSuggestionsContainer = document.querySelector('#search-suggestions');
                    searchSuggestionsContainer.innerHTML = "";
                }
            })
            .build();
    }

    static loading() {
        return FJS.create("div")
            .classes("search-loading", "flex")
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
                        SearchTemplates.resultRelevance(entry.relevance),
                        SearchTemplates.title(entry.link.replace(/https?:\/\//, '').replace(/http?:\/\//, ''), query, query),
                        SearchTemplates.preview(entry.preview, query)
                    ).build()
            ).build();
    }

    static resultRelevance(relevance) {
        const count = Math.round(relevance * 5);
        return FJS.create("div")
            .classes("search-result-type", "text-small")
            .text(new Array(count).fill("⭐").join(""))
            .build();
    }

    static title(title, query) {
        let parts;
        const queryParts = query.split(" ");
        if (!title) {
            parts = ["No title available."];
        } else {
            const text = title;
            const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
            if (parts.length === 1) {
                const regex = queryParts.join("|");
                parts = text.split(new RegExp(`(${regex})`, 'gi'));
                let allContained = true;
                let index = 0;
                for (const queryPart of queryParts) {
                    const foundIndex = parts.slice(index).findIndex(part => part.toLowerCase() === queryPart.toLowerCase());
                    if (foundIndex === -1) {
                        allContained = false;
                        break;
                    } else {
                        index += foundIndex + 1;
                    }
                }
                if (!allContained) {
                    parts = [title];
                }
            }
        }
        let spanElements = parts.map((part) => {
            return FJS.create("span")
                .classes(queryParts.some(qp => qp.toLowerCase() === part.toLowerCase()) ? 'highlight' : '_', 'search-result-title-part')
                .text(part)
                .build();
        });

        return FJS.create("div")
            .classes("search-result-title", "text-small")
            .children(...spanElements)
            .build();
    }

    static preview(preview, query) {
        let parts;
        if (!preview) {
            parts = ["No content available."];
        } else {
            const text = "..." + preview + "...";
            const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
        }
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

    static suggestions(results, query) {
        return FJS.create("div")
            .classes("search-suggestions-list", "flex-v")
            .children(...results.map(result => {
                return SearchTemplates.suggestion(result, query);
            }))
            .build();
    }

    static suggestion(result, query) {
        return FJS.create("a")
            .classes("search-suggestion-link")
            .attributes("href", `?query=${result}`, "target", "_blank")
            .children(
                FJS.create("div")
                    .classes("search-suggestion", "flex-v", "padded", "rounded", result.userQuery ? "user-query" : "_")
                    .children(
                        SearchTemplates.title(result.query, query)
                    ).build()
            ).build();
    }
}