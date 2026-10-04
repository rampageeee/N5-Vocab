# Release checks

## Verification performed in this change

`npm test` exercises detached backup validation, browser/native storage failure handling, progress round-trips and retention, reorder permutations, conjugation/editing, conservative checker behavior, source/Polish lesson completeness, sentence selection, and mobile event handling. Mobile tests dispatch the actual pointer and keyboard/dialog handlers in a lightweight DOM/canvas harness and use real KanjiVG/Kana geometry. They cover the reproduced 語 multiple-pass bug, resizing between strokes, cancelled touches, second pointers, retry, composition-confirming Enter, focus trapping and dataset retries.

`node www/tools/check-sentence-bank.cjs` reads the existing bank and starter examples without generating datasets. JavaScript syntax and staged diffs are checked. No APK, Gradle, Capacitor synchronization, or dataset build was run. Browser pixel rendering, real browser accessibility, and Android device behavior are not verified by the DOM harness. Chromium is not installed in this execution environment.

## Browser checklist (manual; not yet run)

Record browser/version, viewport sizes (e.g. 360×800, 412×915, landscape), zoom, theme/palette, locale and result. Serve `www/` as described in README. Start with a disposable browser profile or export the existing dictionary.

- [ ] Add categories and noun, regular/irregular verb, i-/na-adjective entries; edit and reorder them. Duplicate reorder input must be rejected.
- [ ] Learn 水 and 語, remove their final vocabulary entries and add them again; earned character progress remains.
- [ ] Flashcards, drills, reviewed mistakes and all three saved-sentence steps work with Enter and buttons. Confirming Japanese IME composition must not grade or advance; a subsequent Enter should.
- [ ] する, 来る, 食べる, いい and common nouns receive starter examples. Disable the known-vocabulary filter and confirm unfamiliar words are displayed. Polish fallback is labelled; different reconstruction text is not called incorrect Japanese.
- [ ] Valid checker regression examples remain unflagged. Confirmed malformed forms have defensible replacements; unsupported or ambiguous text does not create review exercises.
- [ ] Force sentence/kanji/kana dataset load failure, then retry. Navigate away and back during a load. Starter sentences still work without the broader bank.
- [ ] Trace/test kanji and kana, add strokes after a result, then explicitly retry. Each attempt earns at most one pass. Cancel a touch, use a second finger, resize/rotate mid-drawing, and navigate away while touching. Finished ink must survive resize; interrupted ink must not score.
- [ ] Tab into every flow and modal; focus stays in an open modal, Escape closes it, focus returns to its opener, and the background cannot be focused. Navigation focuses the destination heading.
- [ ] Check light/dark and all palettes, 200% zoom, text scaling and narrow landscape. Review contrast, hit targets, overflow, icon labels, error announcements and screen-reader output. Drawing requires a pointer; its limitation is labelled.
- [ ] Restart/reload preserves vocabulary, notes, locale/settings, selected sentences and earned progress.
- [ ] Export, locate the actual file, reopen and import into a disposable profile; compare vocabulary, notes, settings and every progress collection. Cancelling a share sheet must not update saved-backup status.
- [ ] Malformed/truncated/future-version imports leave live and saved data unchanged. Corrupt startup blocks writes and permits downloading the original payload. Restore from a verified backup.
- [ ] Simulate storage failure: browser mutation reports failure and rolls back; native-style queued writes show unsaved status and retry saves the latest state. Confirm successful persistence after retry and restart.

## Android device checklist (manual; not yet run)

Use the existing maintainer packaging process only when a build is authorized. Record device model, Android/WebView version, application version/commit and results. Test a physical device as well as any emulator.

- [ ] Repeat the browser learning/import/export/handwriting checklist with Gboard Japanese and another supported Japanese keyboard.
- [ ] Enable airplane mode before launch. All local learning datasets load and learning progress survives closing/reopening the app.
- [ ] Rotate during practice and a blind test; resume after backgrounding, screen lock and an interrupted touch. Completed strokes remain correctly placed and no pass is duplicated.
- [ ] Hardware Back closes a modal, then a drawing screen, then the current view, then exits from Home; reopening retains saved data.
- [ ] Verify Preferences failures/retry, Documents permission/error behavior, successful export URI, share cancellation, file-picker cancellation, bad import and backup restore.
- [ ] Check OS font scaling, display zoom, TalkBack, keyboard obscuring inputs, navigation bars/safe areas, theme/palette contrast and focus visibility.
- [ ] Compare a real exported backup after a clean restart with the expected vocabulary, notes, settings and earned progress. Record the file destination, not merely an open chooser/share sheet.

Do not mark native release readiness until these device checks pass. Larger-bank token repair, missing Polish translations, arbitrary alternative sentences, fluent editorial review, and full palette/screen-reader review remain explicit follow-up work.
