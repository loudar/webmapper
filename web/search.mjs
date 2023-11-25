import {SearchTemplates} from "./Templates/SearchTemplates.mjs";
import {SearchAdapter} from "./SearchAdapter.mjs";
import {Api} from "./Api.mjs";
import {StatusTemplates} from "./Templates/StatusTemplates.mjs";

async function loadStatus() {
    const status = await Api.contentStatus();
    const statusContainer = document.querySelector('#content-status');
    const statusElement = StatusTemplates.contentStatus(status);
    statusContainer.innerHTML = "";
    statusContainer.appendChild(statusElement);
}

function triggerLoadStatus() {
    loadStatus().then(() => {
        setInterval(async () => {
            await loadStatus();
        }, 1000 * 30);
    });
}

window.onload = async () => {
    triggerLoadStatus();
    const searchBarContainer = document.querySelector('#search-bar');
    const input = SearchTemplates.input();
    const urlQuery = new URLSearchParams(window.location.search);
    const query = urlQuery.get('query');
    searchBarContainer.appendChild(input);
    if (query) {
        input.value = query;
        await SearchAdapter.search(query);
    }
}
