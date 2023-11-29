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

    static async set(name, value, days) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }

        document.cookie = `${name}=${value || ""}`  + expires + "; path=/";
    }

    static async remove(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
}