function resolver(input) {
  return Array.isArray(input)
    ? input
        .filter((plugin) => !!plugin)
        .map((plugin) =>
          Array.isArray(plugin) ? [require.resolve(plugin[0]), plugin[1]] : require.resolve(plugin)
        )
    : require.resolve(input);
}

module.exports = {
  presets: resolver([
    [
      '@babel/preset-env',
      {
        modules: 'commonjs'
      }
    ],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }]
  ]),
  plugins: resolver([
    // ordering important, decorators before class properties
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-proposal-pipeline-operator', { proposal: 'fsharp' }],
    ['@babel/plugin-proposal-private-methods', { loose: true }],
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-numeric-separator',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-transform-runtime',
    '@babel/plugin-syntax-bigint',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-syntax-import-meta',
    '@babel/plugin-syntax-top-level-await',
    'babel-plugin-styled-components'
  ])
};
