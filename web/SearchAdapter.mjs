import {Api} from "./Api.mjs";
import {SearchTemplates} from "./Templates/SearchTemplates.mjs";

export class SearchAdapter {
    static async search(query) {
        const loadingContainer = document.querySelector('#search-loading');
        loadingContainer.innerHTML = "";
        loadingContainer.appendChild(SearchTemplates.loading());
        window.history.pushState({}, "", `?query=${query}`);
        const results = await Api.search(query);
        loadingContainer.innerHTML = "";
        const searchResultContainer = document.querySelector('#search-results');
        searchResultContainer.innerHTML = "";
        searchResultContainer.appendChild(SearchTemplates.time(results.results.length, results.time));
        searchResultContainer.appendChild(SearchTemplates.resultList(results.results, query));
    }
}