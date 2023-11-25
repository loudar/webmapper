import {Updater} from "./Updater.mjs";

document.addEventListener("keydown", async (event) => {
    if (event.key === "i") {
        await Updater.updateClusters();

        const intervalSeconds = 60 * 30;
        let locked = false;
        setInterval(async () => {
            if (locked) {
                return;
            }
            locked = true;
            await Updater.updateClusters();
            locked = false;
        }, intervalSeconds * 1000);

        document.addEventListener("keyup", async (event) => {
            if (event.key === "r" && !locked) {
                locked = true;
                await Updater.updateClusters();
                locked = false;
            }
        })
    }
});