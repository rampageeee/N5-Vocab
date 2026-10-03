# Sentence examples: review and limits

The larger Tatoeba bank contains 14,834 examples, of which 1,573 have raw stored surfaces that do not reconstruct the sentence and 12,230 have no Polish translation. `node www/tools/check-sentence-bank.cjs` is a read-only audit, not a dataset build. Runtime rejects invalid token alignment and sentences outside the 2–9 token exercise range. The existing bank is preserved; repairing its decomposition requires a separate data review.

Thirty original starter examples are bundled eagerly. Each has aligned surfaces/lemmas, English and Polish translations, and a construction reference. Short questions and noun predicates depend on conversational context; the translation specifies the intended interpretation. This is a construction review, not certification of all possible translations or a fluent-speaker editorial review.

Construction references, read during this review:

- [TUFS: noun predicates](https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/001.html)
- [TUFS: polite verb questions and omitted subjects](https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/024.html)
- [TUFS: i-adjectives and omitted subjects](https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/030.html)
- [TUFS: past adjectives](https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/032.html)
- [TUFS: na-adjective predicates](https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/036.html)

The default selector requires lexical lemmas in the learner's dictionary, allowing the particles/copulas taught in the reference. Disabling the visible filter permits unfamiliar words, which are displayed. Examples rank by unfamiliar lemmas, construction review status, length and translation availability. The filter applies to new selection, not previously saved examples. Dictionary variants are explicit (e.g. 為る/する); inflected spellings come from the shared conjugation table.

Reconstruction requests the saved example. A different answer is described as different from that example, without a claim that the Japanese is incorrect. Reviewed starter examples also accept the same token sequence written in kana using dictionary readings and accepted conjugated spellings. Arbitrary paraphrases require individual review and are not accepted automatically. Tatoeba attribution remains visible for numeric Tatoeba IDs; starter examples link their construction reference.

The 12,230 untranslated examples and the broader bank's grammar remain unreviewed. The UI explicitly identifies missing Polish translations and unreviewed examples. Failed dataset loads are retryable; starter examples work without loading the larger bank.
