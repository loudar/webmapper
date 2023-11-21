import {Updater} from "./Updater.mjs";

await Updater.update();

const intervalSeconds = 60;
let locked = false;
setInterval(async () => {
    if (locked) {
        return;
    }
    locked = true;
    await Updater.update();
    locked = false;
}, intervalSeconds * 1000);