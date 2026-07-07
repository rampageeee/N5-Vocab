/* ============================================================
   I18N
   One t(key, ...args) lookup + a static pass over [data-i18n]
   nodes. English is the default; the chosen locale persists in
   DB.settings and is restored on load. Only UI CHROME is
   translated — the translations the user typed are their data
   and stay in whatever language they wrote them.
   ============================================================ */
const I18N = (() => {

  const dict = {
    en: {
      /* hub */
      'hub.vocab': 'Dictionary', 'hub.flash': 'Flashcards',
      'hub.kanji': 'Kanji writing', 'hub.sentences': 'Sentences',
      'hub.grammar': 'Grammar', 'hub.kana': 'Kana',
      /* topbar */
      'topbar.settings': 'Settings', 'topbar.home': 'Home',
      /* vocab */
      'vocab.title': 'Dictionary',
      'vocab.newCat.ph': 'New category…', 'vocab.addCat': '+ Category',
      'vocab.empty': 'No categories yet. Add the first one above.',
      'vocab.emptyCat': 'Empty category.', 'vocab.addWord': '+ Add word',
      'th.kanji': 'Kanji', 'th.hiragana': 'Hiragana', 'th.trans': 'Translation',
      'cat.rename': 'Rename', 'cat.drag': 'Drag to reorder', 'cat.dupName': 'A category with that name already exists.',
      /* word modal */
      'word.newTitle': 'New word', 'word.editTitle': 'Edit word',
      'word.kanji': 'Kanji', 'word.reading': 'Hiragana / Katakana',
      'word.trans': 'Translation', 'word.pos': 'Part of speech',
      'word.category': 'Category',
      'word.delete': 'Delete', 'word.cancel': 'Cancel', 'word.save': 'Save',
      'word.deleteConfirm': 'Delete this word?',
      'pos.none': '— none', 'pos.noun': 'noun', 'pos.verb': 'verb',
      'pos.iadj': 'i-adjective', 'pos.naadj': 'na-adjective',
      'pos.adverb': 'adverb', 'pos.counter': 'counter', 'pos.particle': 'particle',
      'pos.expression': 'expression',
      /* detail */
      'detail.draw': 'Practice writing →',
      /* flashcards */
      'flash.title': 'Flashcards', 'flash.choose': '— choose a category —',
      'flash.flip': 'tap to flip', 'flash.input.ph': 'type the reading (kana)…',
      'flash.check': 'Check', 'flash.next': 'Next →',
      'flash.revealed.ph': 'revealed — no point',
      'flash.selfcheck': 'Self-check (no point).',
      'flash.correct': 'Correct! +1',
      'flash.cappedToday': 'Correct! (already counted today)',
      'flash.wrong': 'Wrong. Correct answer below.',
      'flash.emptyCat': 'This category is empty.',
      'flash.cycleAgain': "You've been through the whole category.",
      'flash.again': 'Again', 'flash.back': 'Back',
      'flash.progress': 'Progress', 'flash.allCats': 'All categories',
      'flash.noWords': 'No words.', 'flash.pts': 'Points',
      /* kanji */
      'kanji.title': 'Kanji writing',
      'kanji.grid.loading': 'Loading kanji data…',
      'kanji.grid.loadFail': 'Could not load data/kanji-data.js.',
      'kanji.grid.empty': 'No kanji yet. Add words in the Dictionary.',
      'kanji.back': '← Grid', 'kanji.practice': 'Practice', 'kanji.test': 'Test',
      'kanji.clear': 'Clear', 'kanji.retry': 'Retry',
      'kanji.stroke': 'Stroke {0} of {1}',
      'kanji.strokeMem': 'Stroke {0} of {1} (from memory)',
      'kanji.allStrokes': 'All strokes passed ✓',
      'kanji.retryStroke': 'Try this stroke again.',
      'kanji.done': 'Done.',
      'kanji.testMemPrompt': '（draw from memory）',
      'kanji.pass': '{0}/100 — passed ({1}/{2})',
      'kanji.silverStar': ' 🥈 silver star!',
      'kanji.fail': '{0}/100 — below 80, not passed.',
      'kanji.usedIn': 'Appears in words',
      'kanji.noWord': 'no word uses this kanji',
      'kanji.silverProg': 'Silver star: {0}/{1}',
      /* settings */
      'settings.title': 'Settings',
      'settings.appearance': 'Appearance', 'settings.dark': 'Dark mode',
      'settings.language': 'Language',
      'settings.palette': 'Colour palette',
      'settings.kanji': 'Kanji writing', 'settings.tolerance': 'Grading tolerance',
      'tol.lenient': 'lenient', 'tol.normal': 'normal', 'tol.strict': 'strict',
      'settings.stats': 'Statistics',
      'stats.categories': 'Categories', 'stats.words': 'Words',
      'stats.mastered': 'Words with all 3 stars',
      'settings.categories': 'Categories', 'settings.emptyCats': 'No categories.',
      'settings.backup': 'Backup',
      'settings.export': 'Export all data', 'settings.exportBtn': 'Export',
      'settings.import': 'Import from file', 'settings.importBtn': 'Import',
      'settings.lastBackup': 'Last backup',
      'backup.none': 'none', 'backup.today': 'today', 'backup.daysAgo': '{0} days ago',
      'cat.deleteWithWords': 'Delete category “{0}” and its {1} word(s)? This cannot be undone.',
      'cat.deleteEmpty': 'Delete empty category “{0}”?',
      'pal.summer': 'Summer', 'pal.winter': 'Winter', 'pal.fall': 'Autumn',
      'pal.spring': 'Spring', 'pal.geisha': 'Geisha',
      'import.confirm': 'Import will overwrite all current data. Continue?',
      'import.done': 'Imported.', 'import.error': 'Import error: {0}',
      'lang.pl': 'Polski', 'lang.en': 'English',
      /* stubs */
      'stub.next': 'This section will be built in the next step.'
    },

    pl: {
      'hub.vocab': 'Słownik', 'hub.flash': 'Fiszki',
      'hub.kanji': 'Pisanie kanji', 'hub.sentences': 'Zdania',
      'hub.grammar': 'Gramatyka', 'hub.kana': 'Kana',
      'topbar.settings': 'Ustawienia', 'topbar.home': 'Główna',
      'vocab.title': 'Słownik',
      'vocab.newCat.ph': 'Nowa kategoria…', 'vocab.addCat': '+ Kategoria',
      'vocab.empty': 'Brak kategorii. Dodaj pierwszą powyżej.',
      'vocab.emptyCat': 'Pusta kategoria.', 'vocab.addWord': '+ Dodaj słowo',
      'th.kanji': 'Kanji', 'th.hiragana': 'Hiragana', 'th.trans': 'Tłumaczenie',
      'cat.rename': 'Zmień nazwę', 'cat.drag': 'Przeciągnij, aby zmienić kolejność',
      'cat.dupName': 'Kategoria o tej nazwie już istnieje.',
      'word.newTitle': 'Nowe słowo', 'word.editTitle': 'Edytuj słowo',
      'word.kanji': 'Kanji', 'word.reading': 'Hiragana / Katakana',
      'word.trans': 'Tłumaczenie', 'word.pos': 'Część mowy',
      'word.category': 'Kategoria',
      'word.delete': 'Usuń', 'word.cancel': 'Anuluj', 'word.save': 'Zapisz',
      'word.deleteConfirm': 'Usunąć to słowo?',
      'pos.none': '— brak', 'pos.noun': 'rzeczownik', 'pos.verb': 'czasownik',
      'pos.iadj': 'przymiotnik -i', 'pos.naadj': 'przymiotnik -na',
      'pos.adverb': 'przysłówek', 'pos.counter': 'liczebnik / licznik',
      'pos.particle': 'partykuła', 'pos.expression': 'wyrażenie',
      'detail.draw': 'Ćwicz pisanie →',
      'flash.title': 'Fiszki', 'flash.choose': '— wybierz kategorię —',
      'flash.flip': 'dotknij, aby odwrócić', 'flash.input.ph': 'wpisz czytanie (kana)…',
      'flash.check': 'Sprawdź', 'flash.next': 'Następna →',
      'flash.revealed.ph': 'odkryto — bez punktu',
      'flash.selfcheck': 'Samo-sprawdzenie (bez punktu).',
      'flash.correct': 'Dobrze! +1',
      'flash.cappedToday': 'Dobrze! (punkt już zaliczony dziś)',
      'flash.wrong': 'Źle. Poprawna odpowiedź poniżej.',
      'flash.emptyCat': 'Ta kategoria jest pusta.',
      'flash.cycleAgain': 'Przeszłaś przez całą kategorię.',
      'flash.again': 'Jeszcze raz', 'flash.back': 'Wróć',
      'flash.progress': 'Postęp', 'flash.allCats': 'Wszystkie kategorie',
      'flash.noWords': 'Brak słów.', 'flash.pts': 'Punkty',
      'kanji.title': 'Pisanie kanji',
      'kanji.grid.loading': 'Ładowanie danych kanji…',
      'kanji.grid.loadFail': 'Nie udało się wczytać data/kanji-data.js.',
      'kanji.grid.empty': 'Brak kanji. Dodaj słowa w Słowniku.',
      'kanji.back': '← Siatka', 'kanji.practice': 'Ćwiczenie', 'kanji.test': 'Test',
      'kanji.clear': 'Wyczyść', 'kanji.retry': 'Jeszcze raz',
      'kanji.stroke': 'Kreska {0} z {1}',
      'kanji.strokeMem': 'Kreska {0} z {1} (z pamięci)',
      'kanji.allStrokes': 'Wszystkie kreski zaliczone ✓',
      'kanji.retryStroke': 'Spróbuj tę kreskę jeszcze raz.',
      'kanji.done': 'Gotowe.',
      'kanji.testMemPrompt': '（narysuj z pamięci）',
      'kanji.pass': '{0}/100 — zaliczone ({1}/{2})',
      'kanji.silverStar': ' 🥈 srebrna gwiazdka!',
      'kanji.fail': '{0}/100 — poniżej 80, brak zaliczenia.',
      'kanji.usedIn': 'Występuje w słowach',
      'kanji.noWord': 'brak słowa z tym kanji',
      'kanji.silverProg': 'Srebrna gwiazdka: {0}/{1}',
      'settings.title': 'Ustawienia',
      'settings.appearance': 'Wygląd', 'settings.dark': 'Tryb ciemny',
      'settings.language': 'Język',
      'settings.palette': 'Paleta kolorów',
      'settings.kanji': 'Pisanie kanji', 'settings.tolerance': 'Tolerancja oceny',
      'tol.lenient': 'łagodna', 'tol.normal': 'normalna', 'tol.strict': 'surowa',
      'settings.stats': 'Statystyki',
      'stats.categories': 'Kategorie', 'stats.words': 'Słowa',
      'stats.mastered': 'Słowa z 3 gwiazdkami',
      'settings.categories': 'Kategorie', 'settings.emptyCats': 'Brak kategorii.',
      'settings.backup': 'Kopia zapasowa',
      'settings.export': 'Eksportuj wszystkie dane', 'settings.exportBtn': 'Eksport',
      'settings.import': 'Importuj z pliku', 'settings.importBtn': 'Import',
      'settings.lastBackup': 'Ostatnia kopia',
      'backup.none': 'brak', 'backup.today': 'dziś', 'backup.daysAgo': '{0} dni temu',
      'cat.deleteWithWords': 'Usunąć kategorię „{0}” wraz z {1} słowami? Tego nie można cofnąć.',
      'cat.deleteEmpty': 'Usunąć pustą kategorię „{0}”?',
      'pal.summer': 'Lato', 'pal.winter': 'Zima', 'pal.fall': 'Jesień',
      'pal.spring': 'Wiosna', 'pal.geisha': 'Gejsza',
      'import.confirm': 'Import nadpisze wszystkie obecne dane. Kontynuować?',
      'import.done': 'Zaimportowano.', 'import.error': 'Błąd importu: {0}',
      'lang.pl': 'Polski', 'lang.en': 'English',
      'stub.next': 'Ta sekcja zostanie zbudowana w następnym kroku.'
    }
  };

  function t(key, ...args) {
    const loc = (window.DB && DB.getLocale()) || 'en';
    let s = (dict[loc] && dict[loc][key]);
    if (s === undefined) s = dict.en[key];
    if (s === undefined) return key;
    args.forEach((a, i) => { s = s.replace('{' + i + '}', a); });
    return s;
  }

  // Replace textContent / placeholder / aria-label on tagged static nodes.
  function applyStatic(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  return { t, applyStatic };
})();
