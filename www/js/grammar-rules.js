/* ============================================================
   GRAMMAR RULES (static reference data)
   The full N5 particle rulebook, ships whole as browsable Grammar
   tab content — per build-spec-coarse.md §2: "the rulebook is
   canonical and ships whole... this is a reference the user
   reads." The (future) sentence checker enforces only a coarse
   structural subset derived from this — the two are deliberately
   NOT the same granularity. This file is display content only.

   `kind: 'final'` = sentence-final particle (ね/よ/か-as-question):
   no before/after structure, just closes the clause — flagged so
   the UI doesn't force it into a before/after box it doesn't have.
   Everything else is `kind: 'structural'` (the default).
   ============================================================ */
const GRAMMAR_LEGEND = [
  ['N', 'Noun (includes pronouns — they take the same particles as nouns in Japanese)'],
  ['V', 'Verb, any conjugated form'],
  ['V-plain', 'Dictionary form, plain negative, plain past, or plain negative-past (書く/書かない/書いた/書かなかった) — the register used inside embedded clauses'],
  ['V-stem', 'ます-stem (書き, 食べ) — base for other constructions'],
  ['V-potential', 'Potential form (書ける, 食べられる, できる, 来られる)'],
  ['ADJ-i', 'い-adjective, any conjugated form'],
  ['ADJ-na', 'な-adjective'],
  ['PRED', 'Anything that can end a clause: V | ADJ-i | (ADJ-na|N) + だ/です (or a conjugated copula: だった/でした/じゃない/ではありません…)'],
  ['CL', 'A complete clause — subject, particles, and all, ending in PRED'],
  ['+', 'Directly adjacent, nothing in between'],
  ['[ ]', 'One filled slot, shown in examples']
];

const GRAMMAR_RULES = [
  {
    particle: 'は',
    title: 'は — topic marker',
    rules: [
      {
        id: 'WA-1', kind: 'structural',
        pattern: '[N] + は + [PRED]',
        gloss: 'Marks N as the sentence topic — "as for N, …". Replaces が and を outright (you can\u2019t have Nがは or Nをは), but stacks after other particles to add topic/contrast to that role: Nには, Nでは, Nとは, Nからは.',
        examples: [
          { jp: 'わたしは がくせいです。', breakdown: '[わたし] は [がくせいです]' },
          { jp: 'がっこうには 行きません。', breakdown: '[がっこう]に[goal] + は[topic] + [行きません]' }
        ]
      }
    ]
  },
  {
    particle: 'が',
    title: 'が — subject / object-of-stative / "but"',
    callout: 'Structural limit worth knowing: GA-1 and WA-1 have the SAME surface shape (N + PRED). A category-based checker can confirm both are grammatically valid there — it can\u2019t judge which one is the "better" choice in context, since は-vs-が is a discourse decision, not a structural one. Don\u2019t expect this rule set to catch a "technically fine but unnatural" は/が choice.',
    rules: [
      {
        id: 'GA-1', kind: 'structural',
        pattern: '[N] + が + [PRED]',
        gloss: 'Neutral subject marker — identifies who/what, typically new or focused information.',
        examples: [{ jp: 'だれが来ますか。田中さんが来ます。', breakdown: '[田中さん] が [来ます]' }]
      },
      {
        id: 'GA-2', kind: 'structural',
        pattern: '[N] + が + [好き | 嫌い | 上手 | 下手 | ほしい | わかる | できる | V-potential]',
        gloss: 'Marks the object of a closed set of stative predicates: liking, disliking, skill, desire, understanding, ability, and any potential-form verb.',
        examples: [
          { jp: '日本語が話せます。', breakdown: '[日本語] が [話せます]' },
          { jp: '水がほしいです。', breakdown: '[水] が [ほしいです]' }
        ]
      },
      {
        id: 'GA-3', kind: 'structural',
        pattern: '[CL] + が + [CL]',
        gloss: 'Clause-level "but" — softer than a hard contrast, sometimes just connects two related statements politely.',
        examples: [{ jp: 'これは安いですが、それは高いです。', breakdown: '[これは安いです] が [それは高いです]' }]
      }
    ]
  },
  {
    particle: 'を',
    title: 'を — direct object marker',
    rules: [
      {
        id: 'WO-1', kind: 'structural',
        pattern: '[N] + を + [V] (V transitive)',
        gloss: '',
        examples: [{ jp: 'すしを食べます。', breakdown: '[すし] を [食べます]' }]
      },
      {
        id: 'WO-2', kind: 'structural',
        pattern: '[N-place] + を + [V-motion] — small fixed list: 歩く・渡る・飛ぶ・通る',
        gloss: 'Marks the space passed through, not a destination — the verb is intransitive despite taking を.',
        examples: [{ jp: '公園を歩きます。', breakdown: '[公園] を [歩きます]' }]
      },
      {
        id: 'WO-3', kind: 'structural',
        pattern: '[N-place/vehicle] + を + [V-motion] — small fixed list: 出る・降りる・離れる',
        gloss: 'Marks the point of departure.',
        examples: [{ jp: '電車を降ります。', breakdown: '[電車] を [降ります]' }]
      }
    ]
  },
  {
    particle: 'に',
    title: 'に — five core roles',
    rules: [
      {
        id: 'NI-1', kind: 'structural',
        pattern: '[N-place] + に + [いる | ある]',
        gloss: 'Location of existence.',
        examples: [{ jp: '猫が家にいます。', breakdown: '[家] に [existence: います]' }]
      },
      {
        id: 'NI-2', kind: 'structural',
        pattern: '[N-place] + に + [V-motion: 行く・来る・帰る・入る・着く…]',
        gloss: 'Goal/direction of movement.',
        examples: [{ jp: '学校に行きます。', breakdown: '[学校] に [行きます]' }]
      },
      {
        id: 'NI-3', kind: 'structural',
        pattern: '[N-time, fixed point] + に + [PRED]',
        gloss: 'Specific clock time, day of week, date, month, year. Relative time words (今日・明日・毎日・来週) normally take NO particle at all — don\u2019t apply this rule to them.',
        examples: [{ jp: '三時に起きます。', breakdown: '[三時] に [起きます]' }]
      },
      {
        id: 'NI-4', kind: 'structural',
        pattern: '[N-person] + に + [V: あげる・貸す・送る・教える・電話する…]',
        gloss: 'Recipient/indirect object. もらう is the mirror case and takes に or から for the source, not に alone.',
        examples: [{ jp: '友達に本をあげます。', breakdown: '[友達] に [あげます]' }]
      },
      {
        id: 'NI-5', kind: 'structural',
        pattern: '[N | ADJ-na] + に + [なる]',
        gloss: 'Change of state.',
        examples: [{ jp: '先生になりました。', breakdown: '[先生] に [なりました]' }]
      }
    ],
    groupNotes: [
      'Not full rules, just worth knowing: purpose-に after a stem (買い物に行きます), frequency-に (一日に三回).'
    ]
  },
  {
    particle: 'で',
    title: 'で — location of action / means / material',
    rules: [
      {
        id: 'DE-1', kind: 'structural',
        pattern: '[N-place] + で + [V-action] (not いる/ある — that\u2019s NI-1)',
        gloss: '',
        examples: [{ jp: '図書館で勉強します。', breakdown: '[図書館] で [勉強します]' }]
      },
      {
        id: 'DE-2', kind: 'structural',
        pattern: '[N-instrument/method] + で + [V]',
        gloss: '',
        examples: [{ jp: 'バスで行きます。 ペンで書きます。', breakdown: '[バス] で [行きます]' }]
      },
      {
        id: 'DE-3', kind: 'structural',
        pattern: '[N-material] + で + [できている | 作る]',
        gloss: '',
        examples: [{ jp: 'このいすは木でできています。', breakdown: '[木] で [できています]' }]
      }
    ],
    groupNotes: [
      'Causal で ("due to": 病気で休みました) is common enough to see but borderline N4.',
      'Don\u2019t confuse particle で with the copula te-form で (学生で、先生です — connecting nouns/な-adjectives) — same shape, different job entirely.'
    ]
  },
  {
    particle: 'と',
    title: 'と — listing / accompaniment / quotation',
    rules: [
      {
        id: 'TO-1', kind: 'structural',
        pattern: '[N] + と + [N]',
        gloss: 'Exhaustive list — implies nothing else. (Contrast や below.)',
        examples: [{ jp: 'すしとてんぷらを食べます。', breakdown: '[すし] と [てんぷら]' }]
      },
      {
        id: 'TO-2', kind: 'structural',
        pattern: '[N-person] + と + [V]',
        gloss: 'Accompaniment.',
        examples: [{ jp: '友達と映画を見ます。', breakdown: '[友達] と [見ます]' }]
      },
      {
        id: 'TO-3', kind: 'structural',
        pattern: '[CL: V-plain] + と + [言う | 思う | 聞く | 書いてある…]',
        gloss: 'Quotation/content clause.',
        examples: [{ jp: '明日雨が降ると思います。', breakdown: '[明日雨が降る] と [思います]' }]
      }
    ],
    groupNotes: [
      'と同じ／と違う (comparison) and conditional と (V-plain + と + CL, "when/if X, then Y") are real but structurally different from these three — worth keeping as separate grammar-tab entries later rather than folding into TO-1/2/3.'
    ]
  },
  {
    particle: 'も',
    title: 'も — also/too',
    rules: [
      {
        id: 'MO-1', kind: 'structural',
        pattern: '[N] + も + [PRED]',
        gloss: 'Replaces は/が/を the same way は does; stacks after に/で/と/から/まで.',
        examples: [{ jp: 'わたしも学生です。', breakdown: '' }]
      }
    ],
    groupNotes: [
      'Interrogative + も + negative predicate = total negation — 何もありません (nothing), だれも来ません (nobody came).'
    ]
  },
  {
    particle: 'の',
    title: 'の — possessive / nominalizer',
    rules: [
      {
        id: 'NO-1', kind: 'structural',
        pattern: '[N] + の + [N]',
        gloss: 'Possession or noun-modifying-noun.',
        examples: [{ jp: 'わたしの本です。', breakdown: '[わたし] の [本]' }]
      },
      {
        id: 'NO-2', kind: 'structural',
        pattern: '[CL: V-plain] + の + [PRED]',
        gloss: 'Turns a clause into a noun phrase.',
        examples: [{ jp: '泳ぐのが好きです。', breakdown: '[泳ぐ] の [が好きです]' }]
      }
    ],
    groupNotes: [
      'Explanatory の in speech (どうしたんですか) and pronominal の standing in for an already-mentioned noun (赤いのをください — "the red one") are both common at N5 but are their own patterns, not this connector.'
    ]
  },
  {
    particle: 'から',
    title: 'から — starting point / reason',
    rules: [
      {
        id: 'KARA-1', kind: 'structural',
        pattern: '[N] + から + [PRED]',
        gloss: 'Spatial or temporal starting point, often paired with まで.',
        examples: [{ jp: '九時から始まります。', breakdown: '[九時] から [始まります]' }]
      },
      {
        id: 'KARA-2', kind: 'structural',
        pattern: '[CL] + から + [CL]',
        gloss: 'Reason/cause — attaches after a full predicate (plain or polite), not a bare noun.',
        examples: [{ jp: '忙しいから、行きません。', breakdown: '[忙しい] から [行きません]' }]
      }
    ],
    groupNotes: [
      'もらう\u2019s source can be marked から instead of に (田中さんからもらいました).'
    ]
  },
  {
    particle: 'まで',
    title: 'まで — endpoint',
    rules: [
      {
        id: 'MADE-1', kind: 'structural',
        pattern: '[N-place/time] + まで + [PRED]',
        gloss: '',
        examples: [{ jp: '五時まで働きます。', breakdown: '[五時] まで [働きます]' }]
      }
    ]
  },
  {
    particle: 'や',
    title: 'や — non-exhaustive listing',
    rules: [
      {
        id: 'YA-1', kind: 'structural',
        pattern: '[N] + や + [N]',
        gloss: 'Lists a few examples; implies others exist unlisted — opposite of TO-1. Often closed with など.',
        examples: [{ jp: '机の上に本やペンがあります。', breakdown: '[本] や [ペン]' }]
      }
    ]
  },
  {
    particle: 'か',
    title: 'か — question / alternative / indefinite',
    rules: [
      {
        id: 'KA-1', kind: 'final',
        pattern: '[CL] + か (sentence-final)',
        gloss: 'Turns a statement into a question.',
        examples: [{ jp: 'これは本ですか。', breakdown: '' }]
      },
      {
        id: 'KA-2', kind: 'structural',
        pattern: '[N] + か + [N]',
        gloss: '"Or" between alternatives.',
        examples: [{ jp: 'コーヒーか紅茶がほしいです。', breakdown: '[コーヒー] か [紅茶]' }]
      },
      {
        id: 'KA-3', kind: 'structural',
        pattern: '[interrogative] + か',
        gloss: 'Forms an indefinite pronoun — 何か (something), だれか (someone), どこか (somewhere) — not a real question.',
        examples: [{ jp: '何か食べましたか。', breakdown: '[何] + か = something' }]
      }
    ]
  },
  {
    particle: 'ね',
    title: 'ね — seeking agreement',
    rules: [
      {
        id: 'NE-1', kind: 'final',
        pattern: '[CL] + ね (sentence-final)',
        gloss: 'Softener seeking agreement/confirmation — "right?", "isn\u2019t it?".',
        examples: [{ jp: 'いい天気ですね。', breakdown: '' }]
      }
    ]
  },
  {
    particle: 'よ',
    title: 'よ — asserting information',
    rules: [
      {
        id: 'YO-1', kind: 'final',
        pattern: '[CL] + よ (sentence-final)',
        gloss: 'Tells the listener something they may not know, or emphasizes.',
        examples: [{ jp: 'これはおいしいですよ。', breakdown: '' }]
      }
    ]
  },
  {
    particle: 'へ',
    title: 'へ — direction',
    rules: [
      {
        id: 'HE-1', kind: 'structural',
        pattern: '[N-place] + へ + [V-motion: 行く・来る・帰る]',
        gloss: 'Pronounced "e", not "he", when used as a particle. Overlaps heavily with NI-2 for simple destinations, but へ only ever marks direction — never existence, time, or recipient.',
        examples: [{ jp: '日本へ行きます。', breakdown: '[日本] へ [行きます]' }]
      }
    ]
  },
  {
    particle: 'だけ',
    title: 'だけ — only (neutral)',
    rules: [
      {
        id: 'DAKE-1', kind: 'structural',
        pattern: '[N] + だけ + [PRED]',
        gloss: 'No polarity requirement — works with affirmative or negative predicates.',
        examples: [{ jp: '一つだけください。', breakdown: '[一つ] だけ [ください]' }]
      }
    ]
  },
  {
    particle: 'しか',
    title: 'しか — only (negative-obligatory)',
    rules: [
      {
        id: 'SHIKA-1', kind: 'structural',
        pattern: '[N] + しか + [PRED, negative]',
        gloss: 'Unlike だけ, this REQUIRES a negative predicate — ungrammatical without one.',
        examples: [{ jp: '一つしかありません。', breakdown: '[一つ] しか [ありません]' }]
      }
    ]
  },
  {
    particle: 'より',
    title: 'より — comparison',
    rules: [
      {
        id: 'YORI-1', kind: 'structural',
        pattern: '[N] + より + [CL containing an adjective]',
        gloss: '',
        examples: [{ jp: '東京は大阪より大きいです。', breakdown: '[大阪] より [東京は大きいです]' }]
      }
    ]
  },
  {
    particle: 'ぐらい／くらい',
    title: 'ぐらい／くらい — approximation',
    rules: [
      {
        id: 'GURAI-1', kind: 'structural',
        pattern: '[N-quantity/time] + ぐらい／くらい + [PRED]',
        gloss: '',
        examples: [{ jp: '三時間ぐらいかかります。', breakdown: '[三時間] ぐらい [かかります]' }]
      }
    ]
  }
];
