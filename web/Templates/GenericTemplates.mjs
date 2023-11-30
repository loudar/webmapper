import {FJS} from "@targoninc/fjs";

export class GenericTemplates {
    static simpleLink(text, href) {
        return FJS.create("a")
            .classes("text-small", "max-content")
            .text(text)
            .attributes("href", href)
            .build();
    }
}