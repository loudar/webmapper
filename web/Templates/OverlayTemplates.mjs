import {FJS} from "@targoninc/fjs";

export class OverlayTemplates {
    static progressBar(progress) {
        return FJS.create("div")
            .id("progress-bar")
            .classes("progress")
            .children(
                FJS.create("div")
                    .classes("progress-bar")
                    .styles("width", `${progress}%`)
                    .build()
            )
            .build();
    }
}