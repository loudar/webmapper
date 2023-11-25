import {SearchTemplates} from "./Templates/SearchTemplates.mjs";

window.onload = async () => {
    const searchBarContainer = document.querySelector('#search-bar');
    const inpupt = SearchTemplates.input();
    searchBarContainer.appendChild(inpupt);
}
