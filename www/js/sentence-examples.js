/* Sentence-bank matching and grading helpers; independent of UI and storage. */
const SentenceExamples = (() => {
  const clean = s => String(s || '').normalize('NFKC').replace(/[\s。、！？!?.,「」『』]/g, '');
  const aliases = [['する', '為る'], ['くる', '来る'], ['いる', '居る'],
    ['ある', '有る', '在る'], ['いい', '良い', 'よい']];
  function variants(s) {
    const key = String(s || '').normalize('NFKC').trim();
    return aliases.find(a => a.includes(key)) || [key];
  }
  function keys(w) { return [...new Set([w.kanji, w.reading].filter(Boolean).flatMap(variants))]; }
  function aligned(x) {
    return !!(x && typeof x.jp === 'string' && Array.isArray(x.s) && Array.isArray(x.w)
      && x.s.length >= 2 && x.s.length === x.w.length
      && x.s.every(s => typeof s === 'string' && s.length)
      && x.w.every(s => typeof s === 'string' && s.length)
      && clean(x.jp) === x.s.join('').normalize('NFKC'));
  }
  function unknown(x, words, particles) {
    const known = new Set(words.flatMap(keys));
    return [...new Set(x.w.filter(l => !particles.has(l) && !variants(l).some(k => known.has(k))))];
  }
  function matches(answer, expected, alternatives = []) {
    return clean(answer) !== '' && [expected, ...alternatives].some(s => clean(s) === clean(answer));
  }
  return { clean, variants, keys, aligned, unknown, matches };
})();
