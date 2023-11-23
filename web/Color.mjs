import {Util} from "../lib/Util.mjs";

export class Color {
    static fromFrequency(ratio, intensity = null) {
        const hue = Math.floor(ratio * 360);
        if (!intensity) {
            return `hsl(${hue}, 100%, 50%)`;
        } else {
            const saturation = Math.floor(100 * intensity);
            console.log(intensity);
            return `hsla(${hue}, ${saturation}%, 50%, ${intensity})`;
        }
    }

    static fromMapLink(colorMap, url, intensity) {
        const hostname = Util.getHost(url);
        return Color.fromMapHosts(colorMap, hostname, intensity);
    }

    static fromMapHosts(colorMap, host, intensity) {
        if (!colorMap[host]) {
            colorMap[host] = Color.fromFrequency(Math.random(), intensity);
        } else if (intensity) {
            const currentColor = colorMap[host];
            const currentHue = parseInt(currentColor.substring(4, currentColor.indexOf(",")));
            colorMap[host] = `hsla(${currentHue}, 100%, 50%, ${intensity})`;
        }
        return colorMap[host];
    }
}