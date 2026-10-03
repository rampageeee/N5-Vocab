# Improvement batches

Branch: `improve/data-language-mobile`. No APK, Gradle, Capacitor sync, or dataset builds are run during this work.

1. Data safety: verified with `npm test` (9 tests). Version 1 backups validate all collections before adoption; version 0 files migrate with defaults. Invalid imports preserve live/stored data. Browser save errors throw and roll back the mutation. Native writes are serialized; `await DB.flush()` reports completion/failure, and a persistent banner exposes unsaved changes with retry/export actions. Failed startup blocks writes and keeps the original payload for recovery. A repaired import archives it under `n5data-recovery` before replacing storage. Kanji progress/priority survives removing vocabulary. Category/word reorders require a permutation. Opening a share sheet or requesting a browser download does not mark a backup as saved.
2. Conjugation and accepted spellings: pending.
3. Conservative checker and mistake exercises: pending.
4. Source audit and Polish lessons: pending.
5. Sentence selection and grading: pending.
6. Mobile input, handwriting, accessibility and release checks: pending.

Native persistence remains asynchronous: synchronous mutation methods update the active view immediately. The banner and `flush()` distinguish that state from confirmed persistence. An app kill before an awaited write finishes remains a native verification case.

Recovery exports contain the original unreadable bytes. Browser download completion cannot be observed; users must check their downloaded file. Android Documents write and sharing need device testing.
