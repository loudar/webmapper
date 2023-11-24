import {Api} from "./Api.mjs";
import {DataSet} from "vis-data";
import {Network} from "vis-network";
import {VisNetworkOptions} from "./VisNetworkOptions.mjs";
import {Clusterer} from "./Clusterer.mjs";
import {Util} from "../lib/Util.mjs";
import {Color} from "./Color.mjs";
import {OverlayTemplates} from "./Templates/OverlayTemplates.mjs";

export class Updater {
    static async updateClusters() {
        const clusters = await Api.getClusters();
        const graph = document.getElementById('graph');

        let colorMap = {};
        const nodesArray = [];
        const edgesArray = [];
        const maxOutCount = Math.max(...clusters.map(cluster => cluster.outgoingLinkCount));

        let id = 0;
        const minNodeSize = 3;
        const filter = null;
        const onlyshowFiltered = true;
        for (const cluster of clusters) {
            id++;
            const relativeOutCount = cluster.outgoingLinkCount / maxOutCount;
            const label = cluster.host.substring(0, 37) + (cluster.host.length > 37 ? "..." : "");
            const node = {
                id,
                shape: "dot",
                size: minNodeSize + (relativeOutCount * 50),
                color: Color.fromMapHosts(colorMap, cluster.host),
                url: cluster.host,
                label: label,
                title: OverlayTemplates.hoverTitle(cluster.subdomains, cluster.host),
                font: {
                    size: 4 + (relativeOutCount * 26)
                }
            };
            if (filter) {
                let found = false;
                for (const filterItem of filter) {
                    if (cluster.host.includes(filterItem)) {
                        node.color = "#f00";
                        node.font.color = "#f00";
                        found = true;
                    }
                }
                if (!found) {
                    node.color = "#222";
                    node.font.color = "#bbb";
                }
            } else {
                node.label = label;
            }
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
                const title = `${cluster.host} -> ${targetHost.host} (${targetHost.incomingLinkCount})`;
                const edge = {
                    from: id,
                    to: targetId,
                    width: 1 + (effectiveStrength * 3),
                    length: 50 + (effectiveStrength * 300),
                    title: title,
                    color: {
                        color: Color.fromMapHosts(colorMap, cluster.host, 0.15),
                        highlight: "#ff0077",
                        inherit: false
                    },
                };
                if (filter) {
                    let found = false;
                    for (const filterItem of filter) {
                        if (cluster.host.includes(filterItem) || targetHost.host.includes(filterItem)) {
                            edge.color.color = "#f00";
                            edge.color.highlight = "#f00";
                            found = true;
                        }
                    }
                    if (!found) {
                        edge.color.color = "#222";
                        edge.color.highlight = "#bbb";
                        edge.width = 1;
                    }
                }
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