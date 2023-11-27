import {SearchTemplates} from "./Templates/SearchTemplates.mjs";
import {SearchAdapter} from "./SearchAdapter.mjs";

window.onload = async () => {
    const searchBarContainer = document.querySelector('#search-bar');
    const input = SearchTemplates.input();
    const urlQuery = new URLSearchParams(window.location.search);
    const query = urlQuery.get('query');
    searchBarContainer.replaceWith(input);
    if (query) {
        input.value = query;
        await SearchAdapter.search(query);
    }
}
