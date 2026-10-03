const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(files = [], options = {}) {
  const values = new Map(Object.entries(options.stored || {}));
  const context = vm.createContext({ console, Intl, setTimeout, clearTimeout,
    window: options.window || {}, ...options.globals,
    localStorage: options.storage || {
      getItem: k => values.get(k) ?? null,
      setItem: (k, v) => { if (options.failWrite?.()) throw new Error('disk full'); values.set(k, v); }
    }
  });
  for (const file of ['backup-schema', 'data', ...files]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js', file + '.js'), 'utf8'), context, { filename: file });
  }
  return { context, values, get: name => vm.runInContext(name, context), db: vm.runInContext('DB', context) };
}
const word = (db, kanji = '水', reading = 'みず', pos = 'noun', extras = {}) => {
  db.addCategory('N5');
  return db.addWord({ kanji, reading, translation: 'test', category: 'N5', pos, ...extras });
};
module.exports = { load, word };
