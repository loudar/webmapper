export class Util {
    static getHost(link) {
        try {
            const url = new URL(link);
            return url.hostname;
        } catch (e) {
            console.error(`Failed to get host for ${link}: ${e}`);
            return null;
        }
    }

    static formatTime(amount) {
        if (amount < 1000) {
            return `${amount}ms`;
        }
        const seconds = Math.floor(amount / 1000);
        const milliseconds = amount % 1000;
        return `${seconds}.${milliseconds}s`;
    }
}