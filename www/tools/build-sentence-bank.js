#!/usr/bin/env node
/* ============================================================
   BUILD SENTENCE BANK  (offline, run by hand, not shipped)

   Turns the Tatoeba exports into data/sentence-bank.js — a static,
   lemma-indexed bank of short Japanese sentences with translations.

   WHY A BUILD STEP AND NOT A RUNTIME FETCH
   The app is offline-first inside a Capacitor APK. Nothing here can
   run on the phone: the raw exports are hundreds of megabytes and
   the lemma decomposition has to happen once, not per session.

   WHAT MAKES THIS WORK AT ALL
   jpn_indices.csv. Tatoeba ships a per-sentence word decomposition
   for Japanese (inherited from WWWJDIC's example file), giving the
   DICTIONARY FORM of every word in every sentence. That is the
   whole reason this is feasible without bundling a morphological
   analyser: the word -> sentence index is read straight out of the
   dump, and so is the predicate at the end of each sentence.

   FILTERING STRATEGY — read this before changing the thresholds
   There is no official JLPT N5 word list; every one in circulation
   is a community reconstruction, and they disagree. So difficulty
   is NOT filtered against a list here. Two proxies instead:

     1. length     — short sentences are simple sentences
     2. frequency  — a sentence is kept only if every one of its
                     lemmas is inside the top FREQ_RANK most common
                     lemmas across the whole Japanese corpus

   That yields a beginner-ish bank without pretending to know where
   N5 ends. The REAL difficulty filter happens at runtime: the app
   keeps only sentences whose lemmas are all in her own dictionary,
   so the bank shipped here is a superset that gets narrower as her
   vocabulary decides it. That is deliberate — it means the bank
   never has to be rebuilt when she adds a word.

   INPUTS (download + decompress from https://tatoeba.org/downloads)
     sentences.csv      id \t lang \t text
     links.csv          id \t translation_id
     jpn_indices.csv    sentence_id \t meaning_id \t decomposition

   Optional: her exported n5data.json (Settings -> export). When
   given, prints a coverage report — how many of her words actually
   have a usable sentence — which is the number that decides whether
   this feature is worth shipping at all.

   USAGE
     node build-sentence-bank.js --dir ./tatoeba [--dict n5data.json]
                                 [--out ../data/sentence-bank.js]

   LICENCE — NOT OPTIONAL
   Tatoeba sentences are CC-BY 2.0 FR. The generated file carries an
   attribution header and the app must show a credit line somewhere
   the user can reach (Settings is the obvious place).
   ============================================================ */

'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ---- tunables ------------------------------------------------
const MAX_TOKENS   = 9;      // lemmas per sentence, excluding punctuation
const MAX_CHARS    = 34;     // hard cap on raw length; catches long single-lemma runs
const FREQ_RANK    = 1800;   // a lemma must be this common (or commoner) to be allowed
const MAX_PER_LEMMA = 12;    // cap sentences kept per lemma — stops the bank filling up
                             // with 500 sentences about 私 and none about 雪
const TRANS_LANGS  = ['eng', 'pol'];

// ---- args ----------------------------------------------------
function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const DIR  = arg('dir', '.');
const OUT  = arg('out', path.join('..', 'data', 'sentence-bank.js'));
const DICT = arg('dict', null);

const file = n => path.join(DIR, n);
function need(p) {
  if (!fs.existsSync(p)) { console.error('missing input: ' + p); process.exit(1); }
  return p;
}

async function eachLine(p, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(p), crlfDelay: Infinity });
  for await (const line of rl) if (line) fn(line);
}

/* ---- jpn_indices decomposition -------------------------------
   Token grammar (WWWJDIC "B line"):
     headword(reading)|sense{surface}~
   Every part after the headword is optional and they can co-occur
   in any combination, so the parse takes the headword as "everything
   up to the first delimiter" and pulls {surface} out separately when
   present. `~` marks a verified token and is discarded.

   The surface form matters: it is how the word actually appears in
   the sentence, which is what the app needs to highlight the target
   word and to locate the predicate for a transformation exercise. */
function parseTokens(decomp) {
  const out = [];
  decomp.split(' ').forEach(raw => {
    const tok = raw.trim().replace(/~+$/, '');
    if (!tok) return;
    const head = tok.split(/[({|\[]/)[0];
    if (!head) return;
    const m = tok.match(/\{([^}]*)\}/);
    out.push({ lemma: head, surface: m ? m[1] : head });
  });
  return out;
}

const PUNCT = /^[。、！？「」『』・…,.!?\s]+$/;

(async function main() {
  const fSent = need(file('sentences.csv'));
  const fLink = need(file('links.csv'));
  const fIdx  = need(file('jpn_indices.csv'));

  // ---- pass 1: japanese sentences + candidate translations ----
  console.error('reading sentences.csv …');
  const jp = new Map();          // id -> text
  const tr = new Map();          // id -> { lang, text }
  await eachLine(fSent, line => {
    const i1 = line.indexOf('\t'); if (i1 < 0) return;
    const i2 = line.indexOf('\t', i1 + 1); if (i2 < 0) return;
    const id = line.slice(0, i1);
    const lang = line.slice(i1 + 1, i2);
    const text = line.slice(i2 + 1);
    if (lang === 'jpn') { if (text.length <= MAX_CHARS) jp.set(id, text); }
    else if (TRANS_LANGS.includes(lang)) tr.set(id, { lang, text });
  });
  console.error('  japanese (within length cap): ' + jp.size);

  // ---- pass 2: links, japanese -> translation -----------------
  console.error('reading links.csv …');
  const linked = new Map();      // jp id -> { eng, pol }
  await eachLine(fLink, line => {
    const i = line.indexOf('\t'); if (i < 0) return;
    const a = line.slice(0, i), b = line.slice(i + 1).trim();
    if (!jp.has(a)) return;
    const t = tr.get(b); if (!t) return;
    const slot = linked.get(a) || {};
    if (!slot[t.lang]) { slot[t.lang] = t.text; linked.set(a, slot); }
  });
  console.error('  with a translation: ' + linked.size);

  // ---- pass 3: decompositions ---------------------------------
  console.error('reading jpn_indices.csv …');
  const decomp = new Map();      // jp id -> tokens[]
  const freq = new Map();
  await eachLine(fIdx, line => {
    const i1 = line.indexOf('\t'); if (i1 < 0) return;
    const i2 = line.indexOf('\t', i1 + 1); if (i2 < 0) return;
    const id = line.slice(0, i1);
    if (!linked.has(id)) return;
    const toks = parseTokens(line.slice(i2 + 1)).filter(t => !PUNCT.test(t.lemma));
    if (!toks.length || toks.length > MAX_TOKENS) return;
    decomp.set(id, toks);
    toks.forEach(t => freq.set(t.lemma, (freq.get(t.lemma) || 0) + 1));
  });
  console.error('  decomposed and within token cap: ' + decomp.size);

  // ---- frequency gate -----------------------------------------
  const common = new Set(
    [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, FREQ_RANK).map(e => e[0])
  );

  // ---- select --------------------------------------------------
  // Sorted shortest-first so the per-lemma cap keeps the simplest
  // sentences for each word rather than whichever appeared first.
  const kept = [];
  const perLemma = new Map();
  const ids = [...decomp.keys()].sort((a, b) => decomp.get(a).length - decomp.get(b).length);
  for (const id of ids) {
    const toks = decomp.get(id);
    if (!toks.every(t => common.has(t.lemma))) continue;
    const lemmas = [...new Set(toks.map(t => t.lemma))];
    // keep it only if at least one of its lemmas is still under quota
    if (!lemmas.some(l => (perLemma.get(l) || 0) < MAX_PER_LEMMA)) continue;
    lemmas.forEach(l => perLemma.set(l, (perLemma.get(l) || 0) + 1));
    const t = linked.get(id);
    kept.push({
      id: Number(id),
      jp: jp.get(id),
      en: t.eng || '',
      pl: t.pol || '',
      w: toks.map(x => x.lemma),
      s: toks.map(x => x.surface)
    });
  }
  console.error('kept: ' + kept.length + ' sentences over ' + perLemma.size + ' lemmas');

  // ---- index ---------------------------------------------------
  const index = {};
  kept.forEach((s, i) => {
    [...new Set(s.w)].forEach(l => (index[l] || (index[l] = [])).push(i));
  });

  // ---- coverage report -----------------------------------------
  if (DICT) {
    try {
      const data = JSON.parse(fs.readFileSync(DICT, 'utf8'));
      const words = data.words || [];
      const known = new Set();
      words.forEach(w => { if (w.kanji) known.add(w.kanji.trim()); if (w.reading) known.add(w.reading.trim()); });
      let hit = 0; const misses = [];
      words.forEach(w => {
        const keys = [w.kanji, w.reading].filter(Boolean).map(x => x.trim());
        if (keys.some(k => index[k])) hit++; else misses.push(keys[0] || '?');
      });
      // A sentence is USABLE only if every lemma in it is also in her
      // dictionary — that is the runtime filter, applied here so the
      // report reflects what she would actually be shown, not the bank size.
      const usable = kept.filter(s => s.w.every(l => known.has(l))).length;
      console.error('');
      console.error('COVERAGE against ' + path.basename(DICT));
      console.error('  words in dictionary:        ' + words.length);
      console.error('  words with any sentence:    ' + hit);
      console.error('  sentences fully in-vocab:   ' + usable);
      if (misses.length) console.error('  no sentence for: ' + misses.slice(0, 40).join(' ')
        + (misses.length > 40 ? ' … (+' + (misses.length - 40) + ')' : ''));
    } catch (e) {
      console.error('could not read dictionary export: ' + e.message);
    }
  }

  // ---- emit -----------------------------------------------------
  const header = `/* ============================================================
   SENTENCE BANK — GENERATED FILE, DO NOT EDIT BY HAND
   Rebuild with tools/build-sentence-bank.js.

   Sentences from the Tatoeba Project (https://tatoeba.org),
   licensed CC-BY 2.0 FR. Attribution must remain visible in the
   app. Word decomposition from Tatoeba's jpn_indices export.

   Shape:
     SENTENCE_BANK  [{ id, jp, en, pl, w:[lemma…], s:[surface…] }]
     SENTENCE_INDEX { lemma: [bank index…] }

   Generated ${new Date().toISOString().slice(0, 10)} —
   ${kept.length} sentences, ${Object.keys(index).length} lemmas.
   ============================================================ */
`;
  const body = header
    + 'const SENTENCE_BANK = ' + JSON.stringify(kept) + ';\n'
    + 'const SENTENCE_INDEX = ' + JSON.stringify(index) + ';\n'
    + 'window.SENTENCE_BANK = SENTENCE_BANK;\n'
    + 'window.SENTENCE_INDEX = SENTENCE_INDEX;\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, body);
  console.error('');
  console.error('wrote ' + OUT + '  (' + (body.length / 1024).toFixed(0) + ' KB)');
})();
