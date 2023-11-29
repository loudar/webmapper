export class Cookie {
    static async get(name) {
        const cookies = await Cookie.getAll();
        return cookies[name];
    }

    static async getAll() {
        const cookies = {};
        document.cookie.split(";").forEach(cookie => {
            const [name, value] = cookie.split("=");
            cookies[name.trim()] = value.trim();
        });
        return cookies;
    }

    static async set(name, value) {
        document.cookie = `${name}=${value}`;
    }
}