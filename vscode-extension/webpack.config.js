const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/extension.ts',
  target: 'node', // VS Code extensions run in a node environment
  externals: {
    'vscode': 'commonjs vscode'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: {
      '.js': ['.js', '.ts']
    }
  },
  output: {
    filename: 'extension.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs',
  },
  devtool: 'source-map',
};
