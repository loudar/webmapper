import {Api} from "./Api.mjs";
import {DataSet} from "vis-data";
import {Network} from "vis-network";

const links = await Api.getLinks();
const graph = document.getElementById('graph');

const nodesArray = [];
const edgesArray = [];

let idCounter = 1;
let urlToIdMap = {};

for (const [url] of Object.entries(links)) {
    nodesArray.push({id: idCounter, label: url});
    urlToIdMap[url] = idCounter++;
    for (const link of links[url]) {
        if (!urlToIdMap[link]) {
            urlToIdMap[link] = idCounter++;
        }
    }
}

for (const [url, linkList] of Object.entries(links)) {
    let fromId = urlToIdMap[url];
    for (const link of linkList) {
        let toId = urlToIdMap[link];
        if (!nodesArray.find(node => node.id === toId)) {
            nodesArray.push({id: toId, label: link});
        }
        edgesArray.push({from: fromId, to: toId});
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
    edges: {
        arrows: {
            to: {enabled: true, scaleFactor: 1, type: 'arrow'}
        }
    }
};

const network = new Network(graph, data, options);