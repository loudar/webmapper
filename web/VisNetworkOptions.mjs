export class VisNetworkOptions {
    physics = {
        stabilization: true,
        forceAtlas2Based: {
            theta: 0.75,
            gravitationalConstant: -20,
            centralGravity: 0.005,
            springConstant: 0.08,
            springLength: 300,
            damping: 0.8,
            avoidOverlap: 0.9
        },
        maxVelocity: 50,
        minVelocity: 0.1,
        solver: 'forceAtlas2Based',
    }
    layout = {
        improvedLayout: true,
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
        hover: true
    }
}