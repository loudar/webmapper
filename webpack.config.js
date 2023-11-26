import path from "path";
import dotenv from "dotenv";
import HtmlWebpackPlugin from 'html-webpack-plugin';

dotenv.config();
const dirname = path.resolve();

export default {
    entry: {
        index: "./web/index.mjs",
        search: "./web/search.mjs",
    },
    mode: "production",
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
    ]
};
