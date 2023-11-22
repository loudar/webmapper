import path from "path";
import {spawn} from "child_process";
import dotenv from "dotenv";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
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
    resolve: {
        fallback: {
            "fs": false,
            "readline": false,
            "net": false,
            "tls": false,
            "dns": false,
            "module": false,
            "typescript": false,
            "util": require.resolve("util/"),
            "path": require.resolve("path-browserify"),
            "assert": require.resolve("assert/"),
            "os": require.resolve("os-browserify"),
            "stream": require.resolve("stream-browserify"),
            "url": require.resolve("url/"),
            "process": require.resolve("process/browser"),
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "zlib": require.resolve("browserify-zlib"),
            "crypto": require.resolve("crypto-browserify"),
            "constants": require.resolve("constants-browserify"),
            "child_process": import("child_process")
        }
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

const child = spawn('node --experimental-modules ./server.mjs', [
    `MYSQL_USER=${process.env.MYSQL_USER}`,
    `MYSQL_PASSWORD=${process.env.MYSQL_PASSWORD}`,
], {shell: true});
child.stdout.on('data', function (data) {
    process.stdout.write(data);
});
child.stderr.on('data', function (data) {
    process.stderr.write(data);
});
