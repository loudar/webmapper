import {Cookie} from "./Cookie.mjs";
import {Api} from "./Api.mjs";

export class Auth {
    static async user() {
        const res = await Api.isAuthorized();
        if (res.user) {
            return res.user;
        }

        return null;
    }

    static async authorize(username, password) {
        const res = await Api.authorize(username, password);
        if (res.user === null || res.error) {
            return null;
        }

        return res.user;
    }

    static async logout() {
        await Api.logout();
    }
}