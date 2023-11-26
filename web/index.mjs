import {Updater} from "./Updater.mjs";

let requested = false;
document.addEventListener("keyup", async (event) => {
    if (event.key === "i") {
        if (requested) {
            return;
        }
        requested = true;
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