const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

// Plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

// const STATIC_PATH = process.env.STATIC_PATH || '/static';

const commonHtmlWebpackPluginOptions = {
    // Google Tag Manager ID
    // Looks like 'GTM-XXXXXXX'
    gtm_id: process.env.GTM_ID || '',

    // Google Tag Manager env & auth info for alterative GTM environments
    // Looks like '&gtm_auth=0123456789abcdefghijklm&gtm_preview=env-00&gtm_cookies_win=x'
    // Taken from the middle of: GTM -> Admin -> Environments -> (environment) -> Get Snippet
    // Blank for production
    gtm_env_auth: process.env.GTM_ENV_AUTH || ''
};

const baseConfig = new ScratchWebpackConfigBuilder(
    {
        rootPath: path.resolve(__dirname),
        enableReact: true,
        shouldSplitChunks: false,
        publicPath: 'auto'
    })
    .setTarget('browserslist')
    .merge({
        output: {
            assetModuleFilename: 'static/assets/[name].[hash][ext][query]',
            library: {
                name: 'GUI',
                type: 'umd2'
            }
        },
        resolve: {
            alias: {
                'unifiscratch-vm': path.resolve(__dirname, 'node_modules/scratch-vm/src'),
                'hull.js$': path.resolve(__dirname, 'src/lib/vendor/hull-js.js'),
                'intl-messageformat$': path.resolve(__dirname, 'src/lib/vendor/intl-messageformat.js'),
                'intl-relativeformat$': path.resolve(__dirname, 'src/lib/vendor/intl-relativeformat.js')
            },
            fallback: {
                Buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify')
            }
        }
    })
    .addModuleRule({
        test: /\.mjs$/,
        include: path.resolve(__dirname, 'preload'),
        enforce: 'pre',
        use: path.resolve(__dirname, 'scripts/extension-compat-loader.cjs')
    })
    .addModuleRule({
        test: /\.(svg|png|wav|mp3|gif|jpg)$/,
        resourceQuery: /^$/, // reject any query string
        type: 'asset' // let webpack decide on the best type of asset
    })
    .addPlugin(new webpack.DefinePlugin({
        'process.env.DEBUG': Boolean(process.env.DEBUG),
        'process.env.GA_ID': `"${process.env.GA_ID || 'UA-000000-01'}"`,
        'process.env.GTM_ENV_AUTH': `"${process.env.GTM_ENV_AUTH || ''}"`,
        'process.env.GTM_ID': process.env.GTM_ID ? `"${process.env.GTM_ID}"` : null
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/default'
            },
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/high-contrast'
            },
            {
                // overwrite some of the default block media with high-contrast versions
                // this entry must come after copying scratch-blocks/media into the high-contrast directory
                from: 'src/lib/themes/high-contrast/blocks-media',
                to: 'static/blocks-media/high-contrast',
                force: true
            },
            {
                context: 'node_modules/scratch-vm/dist/web',
                from: 'extension-worker.{js,js.map}',
                noErrorOnMissing: true
            }
        ]
    }));

// Add Workbox plugin for service worker generation
const assetsManifestPath = path.resolve(__dirname, 'src/assetsManifest.json');
const isDevServer = process.env.WEBPACK_SERVE === 'true' || process.argv.includes('serve');
if (isDevServer || process.env.NODE_ENV === 'development' || !fs.existsSync(assetsManifestPath)) {
    console.log('Skipping Workbox plugin for service worker generation');
} else {
    // eslint-disable-next-line global-require
    const assetsManifest = require(assetsManifestPath);
    console.log('Adding Workbox plugin for service worker generation');
    baseConfig
        .addPlugin(new WorkboxPlugin.GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            additionalManifestEntries: assetsManifest,
            exclude: [
                /\.DS_Store/
            ],
            maximumFileSizeToCacheInBytes: 32 * 1024 * 1024
        }))
        .addPlugin(new WebpackPwaManifest({
            publicPath: './',
            name: 'Unifiscratch',
            short_name: 'Unifiscratch',
            description: 'Unified Scratch editor with curated extension support',
            background_color: '#ffffff',
            orientation: 'any',
            crossorigin: 'use-credentials',
            inject: true,
            ios: {
                'apple-mobile-web-app-title': 'Unifiscratch',
                'apple-mobile-web-app-status-bar-style': 'default'
            },
            icons: [
                {
                    src: path.resolve('static/pwa-icon.png'),
                    sizes: [96, 128, 192, 256, 384, 512] // multiple sizes
                },
                {
                    src: path.resolve('static/pwa-maskable_icon.png'),
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable'
                }
            ]
        }));
}

if (!process.env.CI) {
    baseConfig.addPlugin(new webpack.ProgressPlugin());
}

// build the shipping library in `dist/`
const distConfig = baseConfig.clone()
    .merge({
        entry: {
            'scratch-gui': path.join(__dirname, 'src/index.js')
        },
        output: {
            path: path.resolve(__dirname, 'dist')
        }
    })
    .addExternals(['react', 'react-dom'])
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/lib/libraries/*.json',
                    to: 'libraries',
                    flatten: true
                }
            ]
        })
    );

// build the examples and debugging tools in `build/`
const buildConfig = baseConfig.clone()
    .enableDevServer(process.env.PORT || 8601)
    .merge({
        entry: {
            gui: './src/playground/index.jsx',
            blocksonly: './src/playground/blocks-only.jsx',
            compatibilitytesting: './src/playground/compatibility-testing.jsx',
            player: './src/playground/player.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'build')
        }
    })
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['gui'],
        template: 'src/playground/index.ejs',
        title: 'Unifiscratch'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['blocksonly'],
        filename: 'blocks-only.html',
        template: 'src/playground/index.ejs',
        title: 'Unifiscratch: Blocks Only Example'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['compatibilitytesting'],
        filename: 'compatibility-testing.html',
        template: 'src/playground/index.ejs',
        title: 'Unifiscratch: Compatibility Testing'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        ...commonHtmlWebpackPluginOptions,
        chunks: ['player'],
        filename: 'player.html',
        template: 'src/playground/index.ejs',
        title: 'Unifiscratch: Player Example'
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'static',
                to: 'static'
            },
            {
                from: 'extensions/**',
                to: 'static',
                context: 'src/examples'
            }
        ]
    }));

const devServerKeyPath = path.resolve(__dirname, '.vscode/localhost-key.pem');
const devServerCertPath = path.resolve(__dirname, '.vscode/localhost.pem');

if (fs.existsSync(devServerKeyPath) && fs.existsSync(devServerCertPath)) {
    buildConfig.merge({
        devServer: {
            server: {
                type: 'https',
                options: {
                    key: devServerKeyPath,
                    cert: devServerCertPath
                }
            }
        }
    });
}

// resolve symlinks for local development
baseConfig.merge({
    resolve: {
        symlinks: true
    }
});

// Skip building `dist/` unless explicitly requested
// It roughly doubles build time and isn't needed for `scratch-gui` development
// If you need non-production `dist/` for local dev, such as for `scratch-www` work, you can run something like:
// `BUILD_MODE=dist npm run build`
const buildDist = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist';

module.exports = buildDist ?
    [buildConfig.get(), distConfig.get()] :
    buildConfig.get();
