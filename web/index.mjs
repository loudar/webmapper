import {Updater} from "./Updater.mjs";

await Updater.update();

const intervalSeconds = 60 * 10;
let locked = false;
setInterval(async () => {
    if (locked) {
        return;
    }
    locked = true;
    await Updater.update();
    locked = false;
}, intervalSeconds * 1000);

document.addEventListener("keyup", async (event) => {
    if (event.key === "r" && !locked) {
        locked = true;
        await Updater.update();
        locked = false;
    }
})