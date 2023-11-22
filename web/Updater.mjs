import {Api} from "./Api.mjs";
import {DataSet} from "vis-data";
import {Network} from "vis-network";
import {VisNetworkOptions} from "./VisNetworkOptions.mjs";

export class Updater {
    static async update() {
        const links = await Api.getLinks();
        const graph = document.getElementById('graph');

        const nodesArray = [];
        const edgesArray = [];

        let idCounter = 1;
        let urlToIdMap = {};
        let urlFrequencyMap = {};

        const linkKeys = Object.entries(links);
        for (const [url] of linkKeys) {
            urlFrequencyMap[url] = links[url] ? links[url].length : 0;
            urlToIdMap[url] = idCounter++;
            for (const link of links[url]) {
                if (!urlToIdMap[link]) {
                    urlToIdMap[link] = idCounter++;
                }
            }
        }

        let maxFrequency = Math.max(...Object.values(urlFrequencyMap));

        function colorFromFrequency(frequency, transparency = null) {
            const hue = Math.floor(120 * frequency / maxFrequency);
            if (!transparency) {
                return `hsl(${hue}, 100%, 50%)`;
            } else {
                return `hsla(${hue}, 100%, 50%, ${transparency})`;
            }
        }

        const showPercentage = 97;
        for (const [url, id] of Object.entries(urlToIdMap)) {
            let size = links[url] ? links[url].length : 0;
            const relativeSize = size / maxFrequency;
            const linkHasLinks = links[url] && links[url].length > 0;
            if (!linkHasLinks || relativeSize < (100 - showPercentage) / 100) {
                continue;
            }

            const node = {
                id,
                shape: "dot",
                size: 5 + ((relativeSize ** 2) * 50),
                color: colorFromFrequency(size),
                url: url,
                label: url,
                font: {
                    size: 4 + (relativeSize * 26)
                }
            };
            nodesArray.push(node);
        }

        const edgeColor = "rgba(200,200,200,0.5)";
        for (const [url, linkList] of linkKeys) {
            let fromId = urlToIdMap[url];
            for (const link of linkList) {
                const linkHasLinks = links[link] && links[link].length > 0;
                let size = links[url] ? links[url].length : 0;
                const relativeSize = size / maxFrequency;
                if (!linkHasLinks || relativeSize < (100 - showPercentage) / 100) {
                    continue;
                }
                edgesArray.push({
                    from: fromId,
                    to: urlToIdMap[link],
                    color: colorFromFrequency(size, 0.5),
                    width: 1 + (relativeSize * 5),
                    title: `${url} -> ${link}`
                });
            }
        }

        const nodes = new DataSet(nodesArray);
        const edges = new DataSet(edgesArray);

        let data = {
            nodes: nodes,
            edges: edges
        };

        const network = new Network(graph, data, new VisNetworkOptions());

        network.on("click", (params) => {
            if (params.nodes.length === 0) {
                return;
            }
            const nodeId = params.nodes[0];
            const url = nodes.get(nodeId).url;
            window.open(url, "_blank");
        });
    }
}