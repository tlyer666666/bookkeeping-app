const browserGlobals = {
  window: 'readonly', document: 'readonly', location: 'readonly', navigator: 'readonly',
  localStorage: 'readonly', performance: 'readonly', Core: 'readonly', desktopBridge: 'readonly',
  getComputedStyle: 'readonly', URL: 'readonly', Blob: 'readonly', FileReader: 'readonly',
  Event: 'readonly', history: 'readonly', TextDecoder: 'readonly',
  setTimeout: 'writable', clearTimeout: 'writable',
};
const nodeGlobals = {
  require: 'writable', module: 'writable', exports: 'writable', process: 'writable',
  console: 'readonly', globalThis: 'writable', __dirname: 'readonly', Buffer: 'readonly',
  setTimeout: 'writable', clearTimeout: 'writable', URL: 'readonly', fetch: 'readonly',
};
const swGlobals = {
  self: 'readonly', caches: 'readonly', clients: 'readonly',
  URL: 'readonly', fetch: 'readonly', console: 'readonly',
};

export default [
  { ignores: ['node_modules/**', 'release/**', 'docs/**', 'tests/shots/**', '.optimize-backup/**', '.zcode/**', '.mimosa/**'] },
  {
    files: ['core.js', 'tests/**/*.js', 'server.js', 'tools/**/*.js'],
    languageOptions: { globals: nodeGlobals },
  },
  {
    files: ['desktop/main.js', 'desktop/preload.js'],
    languageOptions: { globals: Object.assign({}, nodeGlobals, { Buffer: 'readonly' }) },
  },
  {
    files: ['app.js'],
    languageOptions: { globals: browserGlobals },
  },
  {
    files: ['sw.js'],
    languageOptions: { globals: swGlobals },
  },
  {
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-shadow': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-throw-literal': 'error',
    },
  },
];
