// Learn more: https://docs.expo.dev/guides/monorepos/
// Patch module resolution so nativewind resolves tailwindcss v3 from the
// project's local node_modules, not from the workspace root (which has v4).
const Module = require('node:module')
const path = require('node:path')
const _resolveFilename = Module._resolveFilename.bind(Module)
Module._resolveFilename = (request, parent, isMain, options) => {
  if (request === 'tailwindcss/package.json' || request.startsWith('tailwindcss/')) {
    try {
      return _resolveFilename(
        request,
        {
          ...parent,
          filename: __filename,
          paths: [path.join(__dirname, 'node_modules'), ...Module._nodeModulePaths(__dirname)],
        },
        isMain,
        options,
      )
    } catch (_) {}
  }
  return _resolveFilename(request, parent, isMain, options)
}

const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Monorepo support: watch entire workspace so @t/* resolves.
config.watchFolders = [workspaceRoot]

// Resolve modules from project first, then from workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Disable hierarchical lookup so Metro only uses nodeModulesPaths above.
config.resolver.disableHierarchicalLookup = true

// ---------------------------------------------------------------------------
// Transient / generated directory exclusions
//
// Windows uses FallbackWatcher (no Watchman) which calls FSWatcher.watch() on
// every directory Metro discovers. Vitest coverage runs create and delete
// packages/*/coverage/ mid-watch, causing ENOENT crashes. Exclude all
// generated and ephemeral trees so Metro never tries to watch them.
//
// resolver.blockList  — prevents Metro from resolving files inside these dirs.
// watcher.blockList   — prevents FallbackWatcher from watching these dirs.
// Both must be set; each surface has its own exclusion gate.
// ---------------------------------------------------------------------------
const TRANSIENT_DIRS = [
  // Test artefacts
  /.*[/\\]coverage[/\\].*/,
  /.*[/\\]coverage-final[/\\].*/,
  /.*[/\\]test-results[/\\].*/,
  // Build outputs — scoped to workspace dirs; node_modules/**/dist/** must NOT be blocked
  // because many packages ship compiled dist/ files (e.g. whatwg-fetch, react-native-css-interop).
  /^(?!.*[/\\]node_modules[/\\]).*[/\\]dist[/\\].*/,
  /^(?!.*[/\\]node_modules[/\\]).*[/\\]dist-electron[/\\].*/,
  // Framework caches
  /.*[/\\]\.next[/\\].*/,
  /.*[/\\]\.turbo[/\\].*/,
  /.*[/\\]node_modules[/\\]\.cache[/\\].*/,
  // Expo generated state (safe to exclude from watcher; not needed for bundling)
  /.*[/\\]\.expo[/\\].*/,
  // Tooling output
  /.*[/\\]graphify-out[/\\].*/,
]

// Directories safe to exclude from the resolver too (no source code inside).
// .expo is intentionally NOT in this list because Metro reads manifest files
// from apps/mobile/.expo at startup.
const RESOLVER_BLOCK = TRANSIENT_DIRS.filter((re) => re.source !== /.*[/\\]\.expo[/\\].*/.source)

// Merge RESOLVER_BLOCK with any blockList Expo's getDefaultConfig already set.
const existingBlockList = config.resolver.blockList
const baseList = existingBlockList
  ? Array.isArray(existingBlockList)
    ? existingBlockList
    : [existingBlockList]
  : []
config.resolver.blockList = [...baseList, ...RESOLVER_BLOCK]

// Apply the full TRANSIENT_DIRS set (including .expo) to the file-map watcher.
// metro-file-map respects watcher.blockList (Metro >=0.80 / Expo SDK 51+).
config.watcher = {
  ...config.watcher,
  blockList: TRANSIENT_DIRS,
  // Healthcheck keeps the watcher alive on Windows even when watched dirs
  // temporarily disappear; interval in ms.
  healthCheck: {
    enabled: true,
    interval: 30000,
  },
}

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, 'global.css'),
  configPath: path.resolve(projectRoot, 'tailwind.config'),
})
