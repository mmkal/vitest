import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import pkg from './package.json' assert { type: 'json' }

const external = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies || {}),
  'vitest/node',
  'vitest',
  'worker_threads',
  'node:worker_threads',
]

const plugins = [
  resolve({
    preferBuiltins: true,
  }),
  json(),
  commonjs(),
  esbuild({
    target: 'node18',
  }),
]

const input = {
  index: './src/node/index.ts',
  providers: './src/node/providers/index.ts',
}

export default () => [
  {
    input,
    output: {
      dir: 'dist',
      format: 'esm',
    },
    external,
    plugins,
  },
  {
    input: input.index,
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    external,
    plugins: [dts()],
  },
]
