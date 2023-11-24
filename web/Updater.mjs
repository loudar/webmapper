import {Api} from "./Api.mjs";
import {DataSet} from "vis-data";
import {Network} from "vis-network";
import {VisNetworkOptions} from "./VisNetworkOptions.mjs";
import {Clusterer} from "./Clusterer.mjs";
import {Util} from "../lib/Util.mjs";
import {Color} from "./Color.mjs";
import {OverlayTemplates} from "./Templates/OverlayTemplates.mjs";

export class Updater {
    static async updateNodes() {
        const links = await Api.getLinks();
        const graph = document.getElementById('graph');

        const nodesArray = [];
        const edgesArray = [];

        let idCounter = 1;
        let urlToIdMap = {};
        let urlOutCountMap = {};
        let urlInCountMap = {};
        let colorMap = {};

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
            const relativeOutCount = outCount / maxOutCount;
            if (outCount < countTreshhold) {
                continue;
            }

            const node = {
                id,
                shape: "dot",
                size: minNodeSize + (relativeOutCount * 50),
                color: Color.fromMapLink(colorMap, url),
                url: url,
                label: url.substring(0, 37) + (url.length > 37 ? "..." : ""),
                font: {
                    size: 4 + (relativeOutCount * 26)
                },
                options: {
                    clusterId: Util.getHost(url)
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
                        color: Color.fromMapLink(colorMap, node.url, 0.3),
                        hover: "#ff0077",
                        highlight: "#ff0077",
                        inherit: "from"
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

    static async updateClusters() {
        const clusters = await Api.getClusters();
        const graph = document.getElementById('graph');

        let colorMap = {};
        const nodesArray = [];
        const edgesArray = [];
        const maxOutCount = Math.max(...clusters.map(cluster => cluster.outgoingLinkCount));

        let id = 0;
        const minNodeSize = 3;
        for (const cluster of clusters) {
            id++;
            const relativeOutCount = cluster.outgoingLinkCount / maxOutCount;
            const node = {
                id,
                shape: "dot",
                size: minNodeSize + (relativeOutCount * 50),
                color: Color.fromMapHosts(colorMap, cluster.host),
                url: cluster.host,
                label: cluster.host.substring(0, 37) + (cluster.host.length > 37 ? "..." : ""),
                title: cluster.subdomains.join("\r\n"),
                font: {
                    size: 4 + (relativeOutCount * 26)
                }
            };
            nodesArray.push(node);
        }

        const maxIncomingLinkCount = Math.max(...clusters.map(cluster => cluster.targetHosts.map(host => host.incomingLinkCount).reduce((a, b) => a + b, 0)));
        for (const cluster of clusters) {
            const id = nodesArray.find(node => node.url === cluster.host)?.id;
            if (!id) {
                console.error(`Failed to find ID for ${cluster.host}`);
                continue;
            }
            const outgoingRelative = cluster.outgoingLinkCount / maxOutCount;
            for (let targetHost of cluster.targetHosts) {
                const targetId = nodesArray.find(node => node.url === targetHost.host)?.id;
                if (!targetId) {
                    console.error(`Failed to find target ID for `, { host: targetHost.host });
                    continue;
                }
                if (targetId === id) {
                    continue;
                }
                const effectiveStrength = outgoingRelative;
                const edge = {
                    from: id,
                    to: targetId,
                    width: 1 + (effectiveStrength * 3),
                    length: 50 + (effectiveStrength * 300),
                    title: `${cluster.host} -> ${targetHost.host} (${targetHost.incomingLinkCount})`,
                    color: {
                        color: Color.fromMapHosts(colorMap, cluster.host, 0.15),
                        highlight: "#ff0077",
                        inherit: false
                    },
                    chosen: false,
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

        console.log(`Trying to draw ${nodesArray.length} nodes and ${edgesArray.length} edges.`);
        let network = new Network(graph, data, new VisNetworkOptions());
        network.on("stabilizationIterationsDone", () => {
            network.setOptions({
                physics: false
            });
            network.redraw();
            console.log("Done.");
        });
        network.on("stabilizationProgress", params => {
            if (params.iterations % 10 === 0) {
                Updater.setProgressBar(params.iterations / params.total * 100);
            }
        });
    }

    static setProgressBar(progress) {
        const overlayContainer = document.getElementById("overlay");
        const progressBar = document.getElementById("progress-bar");
        if (!progressBar) {
            const newBar = OverlayTemplates.progressBar(progress);
            overlayContainer.append(newBar);
        } else {
            progressBar.children[0].style.width = `${progress}%`;
        }
        if (progress === 100) {
            document.getElementById("progress-bar").remove();
        }
    }
}