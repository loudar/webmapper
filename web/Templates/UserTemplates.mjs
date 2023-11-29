import {FJS} from "@targoninc/fjs";

export class UserTemplates {
    static registerForm() {
        return FJS.create("form")
            .attributes("id", "registerForm", "action", "/register")
            .children(
                FJS.create("div")
                    .attributes("class", "form-group")
                    .children(
                        FJS.create("label")
                            .attributes("for", "username")
                            .text("Username")
                            .build(),
                        FJS.create("input")
                            .attributes("type", "text", "class", "form-control", "id", "username", "name", "username")
                            .build()
                    ).build(),
                FJS.create("div")
                    .attributes("class", "form-group")
                    .children(
                        FJS.create("label")
                            .attributes("for", "password")
                            .text("Password")
                            .build(),
                        FJS.create("input")
                            .attributes("type", "password", "class", "form-control", "id", "password", "name", "password")
                            .build()
                    ).build(),
                FJS.create("div")
                    .attributes("class", "form-group")
                    .children(
                        FJS.create("label")
                            .attributes("for", "confirmPassword")
                            .text("Confirm Password")
                            .build(),
                        FJS.create("input")
                            .attributes("type", "password", "class", "form-control", "id", "confirmPassword", "name", "confirmPassword")
                            .build()
                    ).build(),
                FJS.create("button")
                    .attributes("type", "submit", "class", "btn btn-primary")
                    .text("Register")
                    .build()
            ).build();
    }
}