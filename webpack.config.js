import path from "path";
import {spawn} from "child_process";
import dotenv from "dotenv";
import HtmlWebpackPlugin from 'html-webpack-plugin';

dotenv.config();
const dirname = path.resolve();

export default {
    entry: {
        index: "./web/index.mjs",
        search: "./web/search.mjs",
    },
    mode: "development",
    output: {
        filename: "[name].mjs",
        path: path.resolve(dirname, "dist"),
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './web/index.html',
            chunks: ['index']
        }),
        new HtmlWebpackPlugin({
            filename: 'search.html',
            template: './web/search.html',
            chunks: ['search']
        })
    ],
    devServer: {
        static: {
            directory: path.join(dirname, "web"),
        },
        open: {
            target: ["/search.html"]
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
    `MYSQL_URL=${process.env.MYSQL_URL}`,
], {shell: true});
child.stdout.on('data', function (data) {
    process.stdout.write(data);
});
child.stderr.on('data', function (data) {
    process.stderr.write(data);
});
