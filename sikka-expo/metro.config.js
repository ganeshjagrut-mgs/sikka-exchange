const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure for SVG support
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg', 'cjs'], // Add .cjs support for Firebase Auth

  // Additional resolver platforms for better compatibility
  platforms: ['ios', 'android', 'native', 'web'],

  // CRITICAL FIX: Disable package.json:exports to fix "Component auth has not been registered yet" error
  // Issue: https://github.com/expo/expo/issues/36496
  // Root cause: Metro's package.json:exports creates "Dual Package Hazard" with Firebase Auth
  // - Both CommonJS and ES Module versions load simultaneously
  // - Native module (auth) registers in one instance but isn't accessible in the other
  // - Results in: "Error: Component auth has not been registered yet"
  // Solution: Disable package exports to use legacy module resolution
  unstable_enablePackageExports: false,

  // Disable symlinks to avoid additional module resolution issues
  unstable_enableSymlinks: false,

  // Enable symlinks resolution for Metro runtime
  resolverMainFields: ['react-native', 'browser', 'main'],

  // CRITICAL: Custom resolver to fix metro-runtime/private/* paths
  // When unstable_enablePackageExports is disabled (to fix Firebase Auth), package.json exports
  // are ignored, breaking the metro-runtime "private/*" → "src/*" mapping
  // The alias config doesn't work when package exports are disabled, so we use a custom resolver
  resolveRequest: (context, moduleName, platform) => {
    // Map metro-runtime/private/* to metro-runtime/src/*
    if (moduleName.startsWith('metro-runtime/private/')) {
      const srcPath = moduleName.replace('metro-runtime/private/', 'metro-runtime/src/');

      try {
        // Try to resolve the src path using the default resolver
        return context.resolveRequest(context, srcPath, platform);
      } catch (e) {
        // If that fails, fall through to default resolution
        console.warn(`Failed to resolve ${srcPath}, falling back to default resolution`);
      }
    }

    // Handle Cashfree SDK package.json import on web
    if (platform === 'web' && moduleName.includes('react-native-cashfree-pg-sdk')) {
      // Return empty module for the entire SDK on web
      return {
        type: 'empty',
      };
    }

    // For all other modules, use the default Expo resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Web-specific configuration for SDK 54
if (process.env.EXPO_WEB) {
  // Disable HMR for web temporarily to avoid Metro runtime issues
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        if (req.url && req.url.includes('hot-updates')) {
          res.writeHead(404);
          res.end();
          return;
        }
        return middleware(req, res, next);
      };
    },
  };
}

module.exports = withNativeWind(config, { input: './global.css' });