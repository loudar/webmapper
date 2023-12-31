import {FJS} from "@targoninc/fjs";

export class StatusTemplates {
    static contentStatus(status) {
        const rawCount = status.total_links;
        const countFormatted = rawCount.toLocaleString();

        return FJS.create("div")
            .classes("flex-v")
            .children(
                FJS.create("div")
                    .classes("loading-bar-container")
                    .children(
                        FJS.create("div")
                            .classes("loading-bar")
                            .styles("width", status.percentage_done)
                            .build(),
                    ).build(),
                FJS.create("div")
                    .classes("flex", "text-small")
                    .children(
                        FJS.create("div")
                            .classes("flex-grow")
                            .text(`${status.total_content_size} / ${countFormatted}`)
                            .build(),
                        FJS.create("div")
                            .text(status.percentage_done + " indexed")
                            .build()
                    ).build()
            ).build();
    }
}