import {Api} from "./Api.mjs";
import {DataSet} from "vis-data";
import {Network} from "vis-network";

const links = await Api.getLinks();
const graph = document.getElementById('graph');

const nodesArray = [];
const edgesArray = [];

let idCounter = 1;
let urlToIdMap = {};
let urlFrequencyMap = {};

const linkKeys = Object.entries(links);
for (const [url] of linkKeys) {
    let urlFrequency = linkKeys.filter(([_, linkList]) => linkList.includes(url)).length;
    urlFrequencyMap[url] = urlFrequency;
    urlToIdMap[url] = idCounter++;
    for (const link of links[url]) {
        if (!urlToIdMap[link]) {
            urlToIdMap[link] = idCounter++;
        }
    }
}

let minSize = 10; // Minimum node size
let maxSize = 100; // Maximum node size
let maxFrequency = Math.max(...Object.values(urlFrequencyMap));

for (const [url, id] of Object.entries(urlToIdMap)) {
    let size = minSize + ((urlFrequencyMap[url] / maxFrequency) * (maxSize - minSize));
    const linkHasLinks = links[url] && links[url].length > 0;
    if (!linkHasLinks) {
        continue;
    }
    nodesArray.push({id, label: url, value: size});
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
        }
    }
};

const network = new Network(graph, data, options);