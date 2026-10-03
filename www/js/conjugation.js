/* Pure morphology shared by DB, drills and the checker. Sources: docs/LANGUAGE-SOURCES.md. */
const Conjugation = (() => {
  const GODAN_ROW = {
    'う': { i:'い', a:'わ', e:'え' }, 'く': { i:'き', a:'か', e:'け' },
    'ぐ': { i:'ぎ', a:'が', e:'げ' }, 'す': { i:'し', a:'さ', e:'せ' },
    'つ': { i:'ち', a:'た', e:'て' }, 'ぬ': { i:'に', a:'な', e:'ね' },
    'ぶ': { i:'び', a:'ば', e:'べ' }, 'む': { i:'み', a:'ま', e:'め' },
    'る': { i:'り', a:'ら', e:'れ' }
  };
  // Table B — onbin (て/た), GODAN only, keyed on final kana. Governed by
  // the verb's own last kana, NOT one blanket "godan" rule.
  const ONBIN = {
    'く': { te:'いて', ta:'いた' }, 'ぐ': { te:'いで', ta:'いだ' },
    'う': { te:'って', ta:'った' }, 'つ': { te:'って', ta:'った' }, 'る': { te:'って', ta:'った' },
    'ぬ': { te:'んで', ta:'んだ' }, 'ぶ': { te:'んで', ta:'んだ' }, 'む': { te:'んで', ta:'んだ' },
    'す': { te:'して', ta:'した' }
  };


  const LOOKALIKES = new Set(['帰る', '入る', '走る', '切る', '知る', '要る', '減る', '蹴る', '喋る', '滑る']);
  const IE_ROW = new Set([...'いきしちにひみりぎじぢびぴえけせてねへめれげぜでべぺ']);
  const kana = s => (s || '').normalize('NFKC').replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const isKanji = c => /[\u4e00-\u9faf\u3400-\u4dbf]/.test(c);
  function key(w) {
    const k = (w.kanji || '').trim(), r = kana((w.reading || '').trim());
    if (w.pos === 'i-adj') return k.endsWith('い') ? k : r || k;
    if (w.pos === 'na-adj') return k || r;
    return k && GODAN_ROW[k.slice(-1)] ? k : r || k;
  }
  function audit(w) {
    if (!w || w.pos !== 'verb') return null;
    const k = key(w);
    if (!k || !GODAN_ROW[k.slice(-1)]) return { state: 'unusable' };
    if (k === 'くる' || /来る$/.test(k) || (/する$/.test(k) && !['こする', 'さする', 'ゆする'].includes(k))) return { state: 'clear', cls: 'irregular' };
    if (!k.endsWith('る') || LOOKALIKES.has(k)) return { state: 'clear', cls: 'godan' };
    const r = kana(w.reading).trim();
    const prev = (r.endsWith('る') ? r : k).slice(-2, -1);
    if (!prev || isKanji(prev) || IE_ROW.has(prev)) return { state: 'ambiguous' };
    return { state: 'clear', cls: 'godan' };
  }
  function adjectiveStem(k) {
    // An explicit lexical exception, not an endsWith('いい') guess: かわいい is regular.
    const ii = { 'いい': 'よ', 'かっこいい': 'かっこよ', 'カッコいい': 'カッコよ', '格好いい': '格好よ' };
    return ii[k] || k.slice(0, -1);
  }
  function generated(w, cls, k) {
    if (!k) return {};
    if (w.pos === 'i-adj') {
      if (!k.endsWith('い')) return {};
      const s = adjectiveStem(k);
      return { past: s + 'かった', negative: s + 'くない', pastNegative: s + 'くなかった',
        polite: k + 'です', politePast: s + 'かったです', politeNegative: s + 'くないです',
        politePastNegative: s + 'くなかったです', formalNegative: s + 'くありません',
        formalPastNegative: s + 'くありませんでした', connective: s + 'くて' };
    }
    if (w.pos === 'na-adj') return { past: k + 'だった', negative: k + 'じゃない', pastNegative: k + 'じゃなかった',
      polite: k + 'です', politePast: k + 'でした', politeNegative: k + 'ではありません',
      politePastNegative: k + 'ではありませんでした', formalNegative: k + 'ではない', formalPastNegative: k + 'ではなかった' };
    if (w.pos !== 'verb') return {};
    let f = {};
    if (cls === 'irregular') {
      if (k.endsWith('する')) {
        const s = k.slice(0, -2);
        f = { masu: s+'します', masen: s+'しません', nai: s+'しない', ta: s+'した', te: s+'して', ba: s+'すれば', potential: s+'できる' };
      } else if (k === 'くる' || k.endsWith('来る')) {
        const s = k.slice(0, -2), kanji = k.endsWith('来る');
        f = { masu: s+(kanji?'来':'き')+'ます', masen: s+(kanji?'来':'き')+'ません',
          nai: s+(kanji?'来':'こ')+'ない', ta: s+(kanji?'来':'き')+'た', te: s+(kanji?'来':'き')+'て',
          ba: s+(kanji?'来':'く')+'れば', potential: s+(kanji?'来':'こ')+'られる' };
      }
    } else if (cls === 'ichidan' && k.endsWith('る')) {
      const s = k.slice(0, -1);
      f = { masu: s+'ます', masen: s+'ません', nai: s+'ない', ta: s+'た', te: s+'て', ba: s+'れば', potential: s+'られる' };
    } else if (cls === 'godan') {
      const last = k.slice(-1), s = k.slice(0,-1), row = GODAN_ROW[last], onb = ONBIN[last];
      if (!row || !onb) return {};
      f = { masu: s+row.i+'ます', masen: s+row.i+'ません', nai: s+row.a+'ない', ta: s+onb.ta, te: s+onb.te, ba: s+row.e+'ば', potential: s+row.e+'る' };
      if (['行く', 'いく'].includes(k)) { f.te = s+'って'; f.ta = s+'った'; }
      if (['ある', '有る', '在る'].includes(k)) f.nai = 'ない';
    }
    if (f.masu) f.mashita = f.masu.slice(0,-2)+'ました';
    if (f.masen) f.masendeshita = f.masen+'でした';
    if (f.nai) f.nakatta = f.nai.slice(0,-2)+'なかった';
    return f;
  }
  function forms(w, cls = w.verb_class, k = key(w)) { return { ...generated(w, cls, k), ...(w.irregular_forms || {}) }; }
  function accepted(w, form) {
    const f = forms(w)[form]; if (!f) return [];
    // Manual overrides remain authoritative. For matching automatic legacy
    // overrides the canonical and kana forms must both be accepted.
    const r = kana(w.reading).trim(), normal = generated(w, w.verb_class, key(w))[form];
    const out = new Set([f]);
    if (r && (!(w.irregular_forms || {})[form] || f === normal)) {
      let rf = generated(w, w.verb_class, r)[form];
      if (w.verb_class === 'irregular' && key(w).endsWith('来る') && r.endsWith('くる')) rf = generated(w, 'irregular', 'くる')[form] && r.slice(0,-2)+generated(w, 'irregular', 'くる')[form];
      if (rf) out.add(rf);
    }
    if (w.pos === 'na-adj' && ['negative', 'pastNegative'].includes(form)) {
      for (const k of [key(w), r].filter(Boolean)) out.add(k + (form === 'negative' ? 'ではない' : 'ではなかった'));
    }
    return [...out];
  }
  function regenerate(w) {
    if (w.pos === 'verb') {
      const a = audit(w);
      if (a.state === 'clear') { w.verb_class = a.cls; w.class_confirmed = true; }
      // Ambiguous verbs generate no claimed forms until the user confirms a class.
      w.forms = a.state === 'unusable' || !w.class_confirmed ? {} : forms(w);
    } else if (['i-adj', 'na-adj'].includes(w.pos)) w.forms = forms(w, null);
    else delete w.forms;
  }
  function stems(w) {
    if (w.pos === 'verb' && !w.class_confirmed) return [];
    const result = [];
    for (const k of new Set([key(w), kana(w.reading).trim()].filter(Boolean))) {
      if (w.pos === 'verb' && w.verb_class === 'ichidan') result.push({ stem: k.slice(0,-1), stemType: 'ichidan' });
      if (w.pos === 'verb' && w.verb_class === 'godan') {
        const row = GODAN_ROW[k.slice(-1)];
        if (row) for (const [r, v] of Object.entries(row)) result.push({ stem: k.slice(0,-1)+v, stemType: r+'-row' });
      }
      if (w.pos === 'i-adj') result.push({ stem: adjectiveStem(k), stemType: 'i-adj' });
      if (w.pos === 'na-adj') result.push({ stem: k, stemType: 'na-adj' });
    }
    return result;
  }
  function clearForEdit(w, old) {
    if (old.kanji === w.kanji && old.reading === w.reading && old.pos === w.pos) return;
    // Overrides are word-specific, including manual ones. Changing identity
    // invalidates them; a translation/category edit does not.
    delete w.irregular_forms; delete w.automatic_forms;
    delete w.verb_class; delete w.class_confirmed; delete w.forms;
  }
  return { key, audit, forms, generated, accepted, regenerate, stems, clearForEdit, kana };
})();
