import {Cookie} from "./Cookie.mjs";
import {Api} from "./Api.mjs";

export class Auth {
    static async user() {
        const user = JSON.parse(localStorage.getItem('user'));

        if (user === null) {
            return null;
        }

        return user;
    }

    static async authorize(username, password) {
        const res = await Api.authorize(username, password);
        if (res.user === null || res.error) {
            localStorage.removeItem('user');
            Cookie.set('connectionCookie', null);
            return null;
        }

        localStorage.setItem('user', JSON.stringify(res.user));
        return res.user;
    }

    static async logout() {
        localStorage.removeItem('user');
        await Api.logout();
    }
}