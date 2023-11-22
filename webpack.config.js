import path from "path";
import {spawn} from "child_process";
import dotenv from "dotenv";

dotenv.config();
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

const child = spawn('node ./server.mjs', [
    `MYSQL_USER=${process.env.MYSQL_USER}`,
    `MYSQL_PASSWORD=${process.env.MYSQL_PASSWORD}`,
], {shell: true});
child.stdout.on('data', function (data) {
    process.stdout.write(data);
});
child.stderr.on('data', function (data) {
    process.stderr.write(data);
});
