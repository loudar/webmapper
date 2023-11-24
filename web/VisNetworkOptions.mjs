export class VisNetworkOptions {
    physics = {
        stabilization: {
            enabled: true,
            iterations: 500,
            updateInterval: 2,
            onlyDynamicEdges: false,
            fit: true
        },
        forceAtlas2Based: {
            theta: 0.75,
            gravitationalConstant: -20,
            centralGravity: 0.005,
            springConstant: 0.5,
            damping: 0.8,
            avoidOverlap: 0.99
        },
        maxVelocity: 50,
        minVelocity: 0.1,
        solver: 'forceAtlas2Based',
    }
    layout = {
        improvedLayout: false,
    }
    edges = {
        smooth: false,
        font: {
            size: 10,
            color: "#fff"
        },
    }
    nodes = {
        font: {
            color: "#fff"
        }
    }
    interaction = {
        hover: true,
        zoomView: true,
        hoverConnectedEdges: false,
        selectConnectedEdges: true,
    }
}