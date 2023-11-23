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
}