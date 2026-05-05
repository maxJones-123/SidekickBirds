const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .csv files as assets
config.resolver.assetExts.push('csv');

module.exports = config;
