import {convert} from "html-to-text";

export class HtmlCleaner {
    static clean(str) {
        let content = str;
        try {
            if (!content) {
                content = "";
            }
            if (content.length < 16777216) {
                    content = convert(content, {
                        wordwrap: false,
                        hideLinkHrefIfSameAsText: true,
                        ignoreHref: true,
                        ignoreImage: true,
                    });
            }
            content = content.replace(/\n/g, ' ');
            content = content.replace(/\s+/g, ' ');
            content = content.replace(/-+/g, '-');
            content = content.replace(/\[[^\]]+]/g, '');
            content = content.trim();
        } catch (e) {
            console.error(`Failed to clean HTML: ${e.message}, saving ${content.length} characters anyway.`);
        }
        if (content.length === 0) {
            content = null;
        }
        return content;
    }
}
