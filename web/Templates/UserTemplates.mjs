import {FJS} from "@targoninc/fjs";
import {Auth} from "../Auth.mjs";

export class UserTemplates {
    static login(router) {
        return FJS.create("div")
            .classes("flex-v", "padded", "rounded", "centered")
            .children(
                FJS.create("div")
                    .classes("flex")
                    .children(
                        FJS.create("label")
                            .attributes("for", "username")
                            .text("Username")
                            .build(),
                        FJS.create("input")
                            .id("username")
                            .name("username")
                            .type("text")
                            .build()
                    ).build(),
                FJS.create("div")
                    .classes("flex")
                    .children(
                        FJS.create("label")
                            .attributes("for", "password")
                            .text("Password")
                            .build(),
                        FJS.create("input")
                            .id("password")
                            .name("password")
                            .type("password")
                            .build()
                    ).build(),
                FJS.create("button")
                    .text("Submit")
                    .onclick(() => {
                        const username = document.getElementById("username").value;
                        const password = document.getElementById("password").value;
                        Auth.authorize(username, password).then(() => {
                            router.navigate("profile");
                        });
                    })
                    .build()
            ).build();
    }
}