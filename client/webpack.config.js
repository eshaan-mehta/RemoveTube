const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    background: './scripts/background.js',
    content: './scripts/content.js',
    popup: './scripts/popup.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
}; 