import {Cookie} from "./Cookie.mjs";
import {Api} from "./Api.mjs";

export class Auth {
    static async user() {
        const user = JSON.parse(localStorage.getItem('user'));
        const connectionCookie = localStorage.getItem('connectionCookie');

        if (user === null) {
            return { user: null, connectionCookie: null };
        }

        return { user, connectionCookie };
    }

    static async getHeaders() {
        const { connectionCookie } = await Auth.user();
        return {
            Cookie: connectionCookie
        };
    }

    static async authorize(username, password) {
        const res = await Api.authorize(username, password);
        if (res.user === null) {
            localStorage.removeItem('user');
            await Cookie.set('connectionCookie', null);
            return null;
        }

        const connectionCookie = res.headers['set-cookie'][0].split(';')[0];
        await Cookie.set('connectionCookie', connectionCookie);
        localStorage.setItem('user', JSON.stringify(res.user));
        return {
            user: res.user,
            connectionCookie
        };
    }

    static async logout() {
        await Api.logout();
        localStorage.removeItem('user');
        await Cookie.set('connectionCookie', null);
    }
}