import {convert} from "html-to-text";

export class HtmlCleaner {
    static clean(str) {
        let content = convert(str, {
            wordwrap: false,
            hideLinkHrefIfSameAsText: true,
            ignoreHref: true,
            ignoreImage: true,
        });
        content = content.replace(/\n/g, ' ');
        return content;
    }
}