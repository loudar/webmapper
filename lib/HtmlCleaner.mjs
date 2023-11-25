import {convert} from "html-to-text";

export class HtmlCleaner {
    static clean(str) {
        let content = str;
        if (content.length < 16777216) {
            try {
                content = convert(content, {
                    wordwrap: false,
                    hideLinkHrefIfSameAsText: true,
                    ignoreHref: true,
                    ignoreImage: true,
                });
            } catch (e) {
                console.error(e);
            }
        }
        content = content.replace(/\n/g, ' ');
        content = content.replace(/\s+/g, ' ');
        content = content.replace(/-+/g, '-');
        content = content.replace('[javascript:void(0);]', '');
        content = content.trim();
        if (content.length === 0) {
            content = null;
        }
        return content;
    }
}
