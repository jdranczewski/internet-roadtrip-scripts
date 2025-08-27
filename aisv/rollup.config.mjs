import babelPlugin from '@rollup/plugin-babel';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import resolvePlugin from '@rollup/plugin-node-resolve';
import replacePlugin from '@rollup/plugin-replace';
import { isAbsolute, relative, resolve } from 'path';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'rollup';
import postcssPlugin from 'rollup-plugin-postcss';
import userscript from 'rollup-plugin-userscript';
import tla from 'rollup-plugin-tla';

// Since this script is really two userscripts in one, I would
// like to build them separately, and then execute one or the other conditionally.
// I achieve this by having a comment-based declaration in index.ts that gets
// replaced with the built source code as a final step.
import { readFile, writeFile } from 'fs/promises';
function printFiles() {
  return {
    name: 'print-files', // this name will show up in logs and errors
    async buildStart(options) {
      for (let filename of options.input) {
        const source = await readFile(filename, 'utf8');
        for (let match of source.match(/\/\/ @print ([\/\\_\.a-zA-Z0-9]+)/g)) {
          const filenameToPaste = match.match(/\/\/ @print ([\/\\_\.a-zA-Z0-9]+)/)[1];
          this.addWatchFile(filenameToPaste)
        }
      }
    },
    async writeBundle(options, bundle) {
      for (const [filename, ] of Object.entries(bundle)) {
        const source = await readFile(`./dist/${filename}`, 'utf8');
        let sourcePasted = source;
        for (let match of source.match(/\/\/ @print ([\/\\_\.a-zA-Z0-9]+)/g)) {
          const filenameToPaste = match.match(/\/\/ @print ([\/\\_\.a-zA-Z0-9]+)/)[1];
          let paste = await readFile(filenameToPaste, 'utf8');
          sourcePasted = sourcePasted.replace(match, paste);
        };
        await writeFile(`./dist/${filename}`, sourcePasted, {encoding: "utf-8"});
        resolve();
      }
    }
  };
}

const { packageJson } = await readPackageUp();
const extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'];

export default defineConfig([
  ...Object.entries({
    'aisv_rt': 'src/aisv/roadtrip/roadtrip.ts',
    'aisv_sv': 'src/aisv/sv/sv.ts',
  }).map(([name, entry]) => ({
    input: entry,
    plugins: [
      postcssPlugin({
        inject: false,
        minimize: true,
      }),
      babelPlugin({
        // import helpers from '@babel/runtime'
        babelHelpers: 'runtime',
        plugins: [
          [
            import.meta.resolve('@babel/plugin-transform-runtime'),
            {
              useESModules: true,
              version: '^7.5.0', // see https://github.com/babel/babel/issues/10261#issuecomment-514687857
            },
          ],
        ],
        exclude: 'node_modules/**',
        extensions,
      }),
      replacePlugin({
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        },
        preventAssignment: true,
      }),
      resolvePlugin({ browser: false, extensions }),
      commonjsPlugin(),
      jsonPlugin(),
      tla()
    ],
    external: defineExternal([
      'solid-js',
      'solid-js/web',
      'internet-roadtrip-framework',
    ]),
    output: {
      format: 'iife',
      name: name,
      file: `dist/${name}.user.js`,
      globals: {
        'solid-js': 'VM.solid',
        'solid-js/web': 'VM.solid.web',
        'internet-roadtrip-framework': 'IRF',
      },
      indent: false,
      inlineDynamicImports: true
    },
  })),
  {
    input: 'src/aisv/index.ts',
    plugins: [
      resolvePlugin({ browser: false, extensions }),
      userscript((meta) => {
        meta = meta.replace('process.env.AUTHOR', packageJson.author.name);
        meta = meta.replace('process.env.VERSION', packageJson.version);
        return meta;
      }),
      printFiles()
    ],
    external: defineExternal([
      'internet-roadtrip-framework',
    ]),
    output: {
      format: 'iife',
      file: `dist/aisv.user.js`,
      globals: {
        'internet-roadtrip-framework': 'IRF',
      },
      indent: false,
      inlineDynamicImports: true
    },
  }
]);

function defineExternal(externals) {
  return (id) =>
    externals.some((pattern) => {
      if (typeof pattern === 'function') return pattern(id);
      if (pattern && typeof pattern.test === 'function')
        return pattern.test(id);
      if (isAbsolute(pattern))
        return !relative(pattern, resolve(id)).startsWith('..');
      return id === pattern || id.startsWith(pattern + '/');
    });
}
