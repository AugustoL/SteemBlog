var webpack = require('webpack');
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    context: path.join(__dirname, "src"),
    devtool: "cheap-module-source-map",
    entry: "./index.js",
    externals: ['ws'],
    module: {
        noParse: ['ws'],
        loaders: [
            {
                test: /\.js?$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader',
                query: {
                    presets: ['react', 'es2015'],
                    plugins: ['react-html-attrs', 'transform-class-properties', 'transform-decorators-legacy'],
                }
            },
            {
                test: /\.css$/,
                loaders: ['style','raw-loader']
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "url-loader?limit=10000&minetype=application/font-woff"
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "file-loader"
            },
            {
                test: /\.png$/,
                loader: "url-loader",
                query: { mimetype: "image/png" }
            },
            {
            test: /\.svg$/,
                loader: "url-loader"
            },
            {
            test: /\.json$/,
                loader: "raw-loader"
            }
        ]
    },
    output: {
        path: __dirname + "/src/",
        filename: "index.min.js"
    },
    plugins: []
};
