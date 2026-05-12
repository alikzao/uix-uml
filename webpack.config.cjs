const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const base = {
  entry: path.resolve(__dirname, 'src/plugin-entry.js'),
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.(woff2?|ttf|eot|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '@uml': path.resolve(__dirname, 'src'),
      '/modules/core/js/extendedComponent.js': path.resolve(__dirname, '../../../core/static/js/extendedComponent.js'),
      '/modules/core/js/popupComponent.js': path.resolve(__dirname, '../../../core/static/js/popupComponent.js'),
      '/modules/core/js/socketService.js': path.resolve(__dirname, '../../../core/static/js/socketService.js')
    }
  },
  optimization: {
    minimize: true
  }
};

const esmConfig = {
  ...base,
  name: 'esm',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'uix-uml.esm.js',
    library: {
      type: 'module'
    },
    environment: {
      module: true
    }
  },
  experiments: {
    outputModule: true
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'uix-uml.css' })
  ]
};

const iifeConfig = {
  ...base,
  name: 'iife',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'uix-uml.iife.js',
    library: {
      name: 'UIXUML',
      type: 'window'
    },
    clean: false
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'uix-uml.css' })
  ]
};

module.exports = [esmConfig, iifeConfig];
