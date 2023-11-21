import path from "path";
import {spawn} from "child_process";

const dirname = path.resolve();

export default {
    entry: [
        "./web/index.mjs"
    ],
    mode: "development",
    output: {
        filename: "index.mjs",
        path: path.resolve(dirname, "dist"),
    },
    devServer: {
        static: {
            directory: path.join(dirname, "web"),
        },
        open: {
            target: ["/index.html"]
        },
        client: {
            overlay: false,
        },
        compress: true,
        port: 3334,
        devMiddleware: {
            writeToDisk: true,
        },
    },
};

const child = spawn('node ./server.mjs', [], {shell: true});
child.stdout.on('data', function (data) {
    process.stdout.write(data);
});
child.stderr.on('data', function (data) {
    process.stderr.write(data);
});
