export class Cookie {
    static get(name) {
        const cookies = Cookie.getAll();
        return cookies[name];
    }

    static getAll() {
        const cookies = {};
        document.cookie.split(";").forEach(cookie => {
            const [name, value] = cookie.split("=");
            cookies[name.trim()] = value.trim();
        });
        return cookies;
    }

    static set(name, value, days) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }

        document.cookie = `${name}=${value || ""}`  + expires + "; path=/";
    }

    static remove(name) {
        const path = "/";
        const domain = window.location.hostname;

        if (domain === "localhost" || domain === "127.0.0.1") {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
        } else {
            console.log("Cannot remove HTTP-Only cookies from the client-side. Consider a server-side solution.");
        }
    }
}