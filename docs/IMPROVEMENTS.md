# Improvement batches

Branch: `improve/data-language-mobile`. No APK, Gradle, Capacitor sync, or dataset builds are run during this work.

1. Data safety: verified with `npm test` (9 tests). Version 1 backups validate all collections before adoption; version 0 files migrate with defaults. Invalid imports preserve live/stored data. Browser save errors throw and roll back the mutation. Native writes are serialized; `await DB.flush()` reports completion/failure, and a persistent banner exposes unsaved changes with retry/export actions. Failed startup blocks writes and keeps the original payload for recovery. A repaired import archives it under `n5data-recovery` before replacing storage. Kanji progress/priority survives removing vocabulary. Category/word reorders require a permutation. Opening a share sheet or requesting a browser download does not mark a backup as saved.
2. Conjugation and accepted spellings: verified with 27 passing tests. Extracted pure module; いい/かっこいい, verb exceptions, polite/negative past, kana variants, editing and ambiguous classes covered. Checker and drill share accepted forms. Sources recorded in LANGUAGE-SOURCES.md.
3. Conservative checker and mistake exercises: verified with valid/invalid/ambiguous regressions. Removed unsupported particle replacements, bare-stem error guesses, and speculative review logging. Handles kana forms, polite past, nominalizing の, quoting と, conjoining が, and punctuation boundaries. Legacy guessed reviews are preserved in backups but excluded from practice.
4. Source audit and Polish lessons: all 35 rules and 19 lessons have pattern-review status, scope and sources. Corrected absolute statements about を/で/と/の/だけ/より and questions. Added Polish lesson explanations and 27 example translations. Optional English chunk glosses and formal reference translations remain editorial work.
5. Sentence selection and grading: pending.
6. Mobile input, handwriting, accessibility and release checks: pending.

Native persistence remains asynchronous: synchronous mutation methods update the active view immediately. The banner and `flush()` distinguish that state from confirmed persistence. An app kill before an awaited write finishes remains a native verification case.

Recovery exports contain the original unreadable bytes. Browser download completion cannot be observed; users must check their downloaded file. Android Documents write and sharing need device testing.

Batch 5 implemented: 30 construction-reviewed bilingual starter examples; explicit default vocabulary filter, dictionary variants, unfamiliar-word and review labels, reviewed kana spelling alternatives, example-specific grading and retryable bank loading. Verified by sentence-selection regressions and the read-only dataset audit. Larger bank repair, mass translation and paraphrase review remain pending; see SENTENCE-REVIEW.md.

Batch 6 implemented: kanji single-result lock; stable glyph-coordinate ink for kanji/kana resize; pointer ownership and cancellation; shared retryable stroke dataset loading; Japanese IME submission guards; modal focus/escape/background inert handling; destination heading focus, zoom enabled, canvas labels and visible keyboard focus. Verified by actual event-handler/geometry regressions in a DOM harness. Browser rendering and native Android checks were not run; the installed Playwright package has no Chromium binary. README and RELEASE-CHECKLIST.md record setup, verification and release gates.

Final automated verification: 66 passing Node regression tests and a read-only sentence-bank audit. No build was executed. The formal grammar reference and optional chunk glosses are still English; full Polish reference translation remains pending. All six implementation batches are separate commits pushed to `improve/data-language-mobile`.
