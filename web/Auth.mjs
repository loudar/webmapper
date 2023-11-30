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

    static async authorizeFromForm(router) {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        Auth.authorize(username, password).then(() => {
            router.navigate("search");
        });
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