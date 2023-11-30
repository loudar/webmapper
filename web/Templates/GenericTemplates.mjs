import {FJS} from "@targoninc/fjs";

export class GenericTemplates {
    static simpleLink(text, href) {
        return FJS.create("a")
            .classes("text-small", "max-content")
            .text(text)
            .attributes("href", href)
            .build();
    }

    static actionButton(text, onclick) {
        return FJS.create("button")
            .classes("text-small", "max-content")
            .text(text)
            .onclick(onclick)
            .build();
    }
}