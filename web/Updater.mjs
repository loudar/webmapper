import {Api} from "./Api.mjs";
import {DataSet} from "vis-data";
import {Network} from "vis-network";

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

        function colorFromFrequency(frequency) {
            const hue = Math.floor(120 * frequency / maxFrequency);
            return `hsl(${hue}, 100%, 50%)`;
        }

        for (const [url, id] of Object.entries(urlToIdMap)) {
            let size = links[url] ? links[url].length : 0;
            const relativeSize = size / maxFrequency;
            const linkHasLinks = links[url] && links[url].length > 0;

            if (!linkHasLinks) {
                continue;
            }

            nodesArray.push({
                id,
                label: url,
                shape: "dot",
                size: 10 + (relativeSize * 50),
                color: colorFromFrequency(size),
            });
        }

        for (const [url, linkList] of linkKeys) {
            let fromId = urlToIdMap[url];
            for (const link of linkList) {
                const linkHasLinks = links[link] && links[link].length > 0;
                if (!linkHasLinks) {
                    continue;
                }
                edgesArray.push({from: fromId, to: urlToIdMap[link]});
            }
        }

        const nodes = new DataSet(nodesArray);
        const edges = new DataSet(edgesArray);

        let data = {
            nodes: nodes,
            edges: edges
        };

        const options = {
            physics: {
                stabilization: false,
                barnesHut: {
                    gravitationalConstant: -20000,
                    springConstant: 0.01,
                    springLength: 200
                }
            },
            layout: {
                improvedLayout: false,
            },
            edges: {
                arrows: {
                    to: {enabled: true, scaleFactor: 1, type: 'arrow'}
                }
            },
            nodes: {
                scaling: {
                    label: {
                        enabled: false,
                        min: 8,
                        max: 30
                    }
                },
                font: { size: 14, color: "#fff" }
            },
            interaction: {
                hover: true
            }
        };

        const network = new Network(graph, data, options);

        network.on("click", (params) => {
            if (params.nodes.length === 0) {
                return;
            }
            const nodeId = params.nodes[0];
            const url = nodes.get(nodeId).label;
            window.open(url, "_blank");
        });
    }
}