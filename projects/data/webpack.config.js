const path = require('path');

module.exports = {
    entry: './src/index.ts',
    mode: 'development',
    target: 'node',
    module: {
        rules: [
            {
                test: /\.(jpe?g|png)$/,
                use: 'file-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    externalsPresets: {
        node: true // in order to ignore built-in modules like path, fs, etc. 
    },
    output: {
        publicPath: '.',
        path: path.resolve(__dirname, 'tmpJS'),
        filename: 'main.js'
    }
};