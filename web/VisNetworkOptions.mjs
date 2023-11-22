export class VisNetworkOptions {
    physics = {
        stabilization: false,
        barnesHut: {
            gravitationalConstant: -20000,
            springConstant: 0.1,
            springLength: 100
        }
    }
    layout = {
        improvedLayout: false,
    }
    edges = {
        arrows: {
            to: {enabled: true, scaleFactor: 1, type: 'arrow'}
        }
    }
    nodes = {
        scaling: {
            label: {
                enabled: false,
                min: 8,
                max: 30
            }
        },
        font: {size: 14, color: "#fff"}
    }
    interaction = {
        hover: true
    }
}