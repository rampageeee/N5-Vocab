# N5 Vocab

An offline vocabulary and beginner Japanese practice app using classic JavaScript and Capacitor. Web files live in `www/`; the existing Android wrapper remains in `android/`. N5 is a learning scope, not an official exhaustive vocabulary or grammar specification.

## Run and verify without building

Use Node.js and Python 3. The dependency-free regression suite needs no package installation:

```sh
npm test
node www/tools/check-sentence-bank.cjs
python3 -m http.server 8080 --directory www
```

Open `http://localhost:8080` for the web app. Keep the same browser origin to retain its localStorage database. Serving the files does not create an APK or run a build. Native dependency installation, Capacitor synchronization and Android packaging are separate maintainer steps; they were not run for this change.

## Data and backups

Browser mutations save to localStorage; native mutations queue ordered Preferences writes. Await `DB.flush()` when completion matters. Storage failures have a persistent alert and a retry action in Settings. Browser failures roll back the failed mutation; native failures keep the latest unsaved state available for retry/export. Do not restart with unsaved changes.

Exports use schema version 1; unversioned legacy backups migrate during validation. Future/invalid schemas are rejected before replacing data. Failed loads block writes and retain recoverable original bytes. Settings can export them; importing a valid replacement archives the recovery payload. Progress belongs to a character and survives removing its last vocabulary entry. Importing a backup deliberately replaces the active dictionary and saved progress.

A browser download request or an opened share sheet does not prove a backup was saved. Check the destination and reopen the file; native Documents export is marked saved only when the filesystem confirms a saved URI.

## Review and release

- [Batch results and remaining work](docs/IMPROVEMENTS.md)
- [Language sources and conjugation limits](docs/LANGUAGE-SOURCES.md)
- [Grammar rule and lesson audit](docs/CONTENT-AUDIT.md)
- [Sentence selection and review](docs/SENTENCE-REVIEW.md)
- [Repeatable Android and browser release checks](docs/RELEASE-CHECKLIST.md)

The sentence checker has a deliberately limited set of form checks. Unhighlighted Japanese is not certified correct. Unsupported/ambiguous constructions do not become correction exercises. Legacy unverified mistake exercises remain in backups but are excluded from active review. Every reference rule has a pattern review and sources; broader linguistic editorial review remains pending.
