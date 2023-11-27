import {Api} from "./Api.mjs";
import {StatisticsTemplates} from "./Templates/StatisticsTemplates.mjs";
import {StatusTemplates} from "./Templates/StatusTemplates.mjs";

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
