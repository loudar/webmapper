export class Semaphore {
    constructor(maxCount) {
        this.maxCount = maxCount;
        this.free = maxCount;
        this.queue = [];
    }

    async wait(){
        if (this.free > 0 && this.queue.length === 0) {
            this.free--;
            return;
        }
        await new Promise(resolve => {
            this.queue.push(() => {
                resolve();
            });
        });
    }

    release(){
        if (this.queue.length > 0) {
            this.queue.shift()();
        } else if (this.free < this.maxCount) {
            this.free++;
        }
    }
}