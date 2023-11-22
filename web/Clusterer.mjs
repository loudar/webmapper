export class Clusterer {
    /**
     *
     * @param network {Network}
     * @param nodes {DataSet}
     */
    static clusterById(network, nodes) {
        const clusters = {};

        console.log("Clustering...");
        nodes.forEach(node => {
            if (!clusters[node.options.clusterId]) {
                clusters[node.options.clusterId] = [];
            }
            clusters[node.options.clusterId].push(node.id);
        });

        // create clusters for each unique clusterId.
        for (const clusterId in clusters) {
            network.cluster({
                joinCondition: function (nodeOptions) {
                    return nodeOptions.clusterId === clusterId; // matching clusterId
                },
                clusterNodeProperties: {
                    id: 'cluster:' + clusterId,
                    label: 'Cluster ' + clusterId,
                    color: 'red',
                    borderWidth: 3
                },
                processProperties: function (clusterOptions, childNodes) {
                    clusterOptions.label = '[' + childNodes.length + ']';
                    return clusterOptions;
                }
            });
        }
        console.log("Done clustering");
        return network;
    }
}