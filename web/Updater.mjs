import {Api} from "./Api.mjs";
import {DataSet} from "vis-data";
import {Network} from "vis-network";
import {VisNetworkOptions} from "./VisNetworkOptions.mjs";
import {Scraper} from "../lib/Scraper.mjs";
import {Clusterer} from "./Clusterer.mjs";

export class Updater {
    static colorFromFrequency(ratio, intensity = null) {
        const hue = Math.floor(180 * (1 - ratio));
        if (!intensity) {
            return `hsl(${hue}, 100%, 50%)`;
        } else {
            const saturation = Math.floor(100 * intensity);
            return `hsla(${hue}, ${saturation}%, 50%, ${intensity})`;
        }
    }

    static async update() {
        const links = await Api.getLinks();
        const graph = document.getElementById('graph');

        const nodesArray = [];
        const edgesArray = [];

        let idCounter = 1;
        let urlToIdMap = {};
        let urlOutCountMap = {};
        let urlInCountMap = {};

        const linkKeys = Object.entries(links);
        for (const [url] of linkKeys) {
            urlOutCountMap[url] = links[url] ? links[url].length : 0;
            urlToIdMap[url] = idCounter++;
            for (const link of links[url]) {
                if (!urlToIdMap[link]) {
                    urlToIdMap[link] = idCounter++;
                }
                if (!urlInCountMap[link]) {
                    urlInCountMap[link] = 1;
                } else {
                    urlInCountMap[link]++;
                }
            }
        }

        const maxInCount = Math.max(...Object.values(urlInCountMap));
        const maxOutCount = Math.max(...Object.values(urlOutCountMap));

        const countTreshhold = 6;
        const minNodeSize = 3;
        for (const [url, id] of Object.entries(urlToIdMap)) {
            const inCount = urlInCountMap[url] ?? 0;
            const outCount = urlOutCountMap[url] ?? 0;
            const relativeInCount = inCount / maxInCount;
            const relativeOutCount = outCount / maxOutCount;
            if (outCount < countTreshhold) {
                continue;
            }

            const node = {
                id,
                shape: "dot",
                size: minNodeSize + (relativeOutCount * 50),
                color: Updater.colorFromFrequency(outCount / maxOutCount),
                url: url,
                label: url,
                font: {
                    size: 4 + (relativeOutCount * 26)
                },
                options: {
                    clusterId: Scraper.getHost(url)
                }
            };
            if (!nodesArray.find(node => node.id === id)) {
                nodesArray.push(node);
            }
        }

        for (const node of nodesArray) {
            const id = node.id;
            for (const link of links[node.url]) {
                const targetId = urlToIdMap[link];
                const outCount = urlOutCountMap[node.url];
                const edge = {
                    from: id,
                    to: targetId,
                    width: 1,
                    hoverWidth: 1,
                    title: `${node.url} -> ${link}`,
                    color: {
                        color: Updater.colorFromFrequency(outCount / 180, 0.3),
                        hover: "#ff0077",
                        highlight: "#ff0077",
                        inherit: false
                    }
                };
                edgesArray.push(edge);
            }
        }

        const nodes = new DataSet(nodesArray);
        const edges = new DataSet(edgesArray);

        let data = {
            nodes: nodes,
            edges: edges
        };

        let network = new Network(graph, data, new VisNetworkOptions());
        network.on("stabilizationIterationsDone", () => {
            network.setOptions({
                physics: false
            });
            network = Clusterer.clusterById(network, nodes);
            network.redraw();
        });

        network.on("doubleClick", params => {
            if (params.nodes.length === 0) {
                return;
            }
            const nodeId = params.nodes[0];
            const url = nodes.get(nodeId).url;
            window.open(url, "_blank");
        });
    }
}