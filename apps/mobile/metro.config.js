// Monorepo Metro config — lets the app bundle workspace packages
// (e.g. @conqr/authz) straight from their TypeScript source.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so changes in packages/* trigger reloads...
config.watchFolders = [workspaceRoot];
// ...and resolve modules from both the app and the workspace root (pnpm).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
