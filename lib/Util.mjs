import psl from "psl";

export class Util {
    static getHost(link) {
        try {
            const url = new URL(link);
            const host = url.hostname;
            if (host.includes("&")) {
                return host.substring(0, host.indexOf("&"));
            }
            return host;
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

    static getDomainFromHost(host) {
        let parsed = psl.parse(host);
        return parsed.domain;
    }
}