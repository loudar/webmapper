import {Updater} from "./Updater.mjs";
import {Api} from "./Api.mjs";
import {StatisticsTemplates} from "./Templates/StatisticsTemplates.mjs";
import {StatusTemplates} from "./Templates/StatusTemplates.mjs";
import {SearchTemplates} from "./Templates/SearchTemplates.mjs";
import {SearchAdapter} from "./SearchAdapter.mjs";

export class Page {
    static cluster() {
        let locked = false;
        const intervalSeconds = 60 * 30;

        document.addEventListener("keyup", async (event) => {
            if (event.key === "i" && !locked) {
                locked = true;
                await Updater.updateClusters();
                locked = false;
            }
        });

        setInterval(async () => {
            if (!locked) {
                locked = true;
                await Updater.updateClusters();
                locked = false;
            }
        }, intervalSeconds * 1000);

        document.addEventListener("keyup", async (event) => {
            if (event.key === "r" && !locked) {
                locked = true;
                await Updater.updateClusters();
                locked = false;
            }
        });
    }

    static stats() {
        const reloadSeconds = 120;

        async function loadStats() {
            const stats = await Api.getStatistics();
            const statsContainer = document.querySelector('#statistics');
            const statsElement = StatisticsTemplates.statsContainer(stats);
            statsContainer.innerHTML = "";
            statsContainer.appendChild(statsElement);
            const contentStatus = await Api.getContentStatus();
            const contentStatusElement = document.querySelector('#content-status');
            contentStatusElement.innerHTML = "";
            const statusElement = StatusTemplates.contentStatus(contentStatus);
            contentStatusElement.appendChild(statusElement);
        }

        function triggerLoadStatus() {
            loadStats().then(() => {
                setInterval(async () => {
                    await loadStats();
                }, 1000 * reloadSeconds);
            });
        }

        triggerLoadStatus();
    }

    static async search(query) {
        const searchBarContainer = document.querySelector('#search-bar');
        const input = SearchTemplates.input();
        searchBarContainer.replaceWith(input);
        if (query) {
            input.value = query;
            await SearchAdapter.search(query);
        }
    }
}