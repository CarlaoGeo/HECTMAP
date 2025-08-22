const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  // Enables CSS support in Metro (primarily for web)
  isCSSEnabled: true, 
});

module.exports = config;