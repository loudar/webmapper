import {Api} from "./Api.mjs";
import {StatisticsTemplates} from "./Templates/StatisticsTemplates.mjs";

const reloadSeconds = 60;

async function loadStats() {
    const stats = await Api.getStatistics();
    const statsContainer = document.querySelector('#statistics');
    const statusElement = StatisticsTemplates.statsContainer(stats);
    statsContainer.innerHTML = "";
    statsContainer.appendChild(statusElement);
}

function triggerLoadStatus() {
    loadStats().then(() => {
        setInterval(async () => {
            await loadStats();
        }, 1000 * reloadSeconds);
    });
}

triggerLoadStatus();
