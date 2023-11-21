import {Api} from "./Api.mjs";
import {DataSet, Network} from "vis-network";

const links = await Api.getLinks();
const graph = document.getElementById('graph');

const nodesArray = [];
const edgesArray = [];
for (const [url, linkList] of Object.entries(links)) {
    nodesArray.push({id: url, label: url});
    for (const link of linkList) {
        edgesArray.push({from: url, to: link});
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