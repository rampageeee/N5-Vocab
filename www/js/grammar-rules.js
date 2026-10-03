/* ============================================================
   GRAMMAR RULES (static reference data)
   Selected beginner particle patterns, ships whole as browsable Grammar
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
    "particle": "は",
    "title": "は — topic marker",
    "rules": [
      {
        "id": "WA-1",
        "kind": "structural",
        "pattern": "[N] + は + [PRED]",
        "gloss": "Marks a topic or contrast. In these beginner patterns は replaces が/を and can follow に/で/と/から/まで.",
        "examples": [
          {
            "jp": "わたしは がくせいです。",
            "breakdown": "[わたし] は [がくせいです]"
          },
          {
            "jp": "がっこうには 行きません。",
            "breakdown": "[がっこう]に[goal] + は[topic] + [行きません]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "が",
    "title": "が — subject / object-of-stative / \"but\"",
    "callout": "These patterns describe common uses. は/が choice depends on context and discourse; the checker does not certify particle choice.",
    "rules": [
      {
        "id": "GA-1",
        "kind": "structural",
        "pattern": "[N] + が + [PRED]",
        "gloss": "Neutral subject marker — identifies who/what, typically new or focused information.",
        "examples": [
          {
            "jp": "だれが来ますか。田中さんが来ます。",
            "breakdown": "[田中さん] が [来ます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "GA-2",
        "kind": "structural",
        "pattern": "[N] + が + [好き | 嫌い | 上手 | 下手 | ほしい | わかる | できる | V-potential]",
        "gloss": "Marks the target of predicates such as liking, desire, understanding and ability. These are examples, not a closed list; potential verbs may also take を.",
        "examples": [
          {
            "jp": "日本語が話せます。",
            "breakdown": "[日本語] が [話せます]"
          },
          {
            "jp": "水がほしいです。",
            "breakdown": "[水] が [ほしいです]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "GA-3",
        "kind": "structural",
        "pattern": "[CL] + が + [CL]",
        "gloss": "Clause-level \"but\" — softer than a hard contrast, sometimes just connects two related statements politely.",
        "examples": [
          {
            "jp": "これは安いですが、それは高いです。",
            "breakdown": "[これは安いです] が [それは高いです]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/082.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "を",
    "title": "を — direct object marker",
    "rules": [
      {
        "id": "WO-1",
        "kind": "structural",
        "pattern": "[N] + を + [V] (V transitive)",
        "gloss": "Marks the direct object of a transitive action.",
        "examples": [
          {
            "jp": "すしを食べます。",
            "breakdown": "[すし] を [食べます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "WO-2",
        "kind": "structural",
        "pattern": "[N-route/space] + を + [V-motion] (e.g. 歩く・渡る・飛ぶ・通る)",
        "gloss": "Marks the space passed through, not a destination — the verb is intransitive despite taking を.",
        "examples": [
          {
            "jp": "公園を歩きます。",
            "breakdown": "[公園] を [歩きます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "WO-3",
        "kind": "structural",
        "pattern": "[N-departure point] + を + [V] (e.g. 出る・降りる・離れる)",
        "gloss": "Marks the point of departure.",
        "examples": [
          {
            "jp": "電車を降ります。",
            "breakdown": "[電車] を [降ります]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "に",
    "title": "に — five core roles",
    "rules": [
      {
        "id": "NI-1",
        "kind": "structural",
        "pattern": "[N-place] + に + [いる | ある]",
        "gloss": "Location of existence.",
        "examples": [
          {
            "jp": "猫が家にいます。",
            "breakdown": "[家] に [existence: います]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "NI-2",
        "kind": "structural",
        "pattern": "[N-place] + に + [V-motion: 行く・来る・帰る・入る・着く…]",
        "gloss": "Goal/direction of movement.",
        "examples": [
          {
            "jp": "学校に行きます。",
            "breakdown": "[学校] に [行きます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "NI-3",
        "kind": "structural",
        "pattern": "[N-time, fixed point] + に + [PRED]",
        "gloss": "Marks a specific time point. Relative expressions such as 今日/明日/毎日 usually appear without に in ordinary scheduling statements; this is a starting guideline.",
        "examples": [
          {
            "jp": "三時に起きます。",
            "breakdown": "[三時] に [起きます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/029.html"
          ]
        }
      },
      {
        "id": "NI-4",
        "kind": "structural",
        "pattern": "[N-person] + に + [V: あげる・貸す・送る・教える・電話する…]",
        "gloss": "Recipient/indirect object. もらう is the mirror case and takes に or から for the source, not に alone.",
        "examples": [
          {
            "jp": "友達に本をあげます。",
            "breakdown": "[友達] に [あげます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "NI-5",
        "kind": "structural",
        "pattern": "[N | ADJ-na] + に + [なる]",
        "gloss": "Change of state.",
        "examples": [
          {
            "jp": "先生になりました。",
            "breakdown": "[先生] に [なりました]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      }
    ],
    "groupNotes": [
      "Purpose に can follow an action noun or a verb stem (買い物に行く / 買いに行く). Frequency uses include 一日に三回."
    ]
  },
  {
    "particle": "で",
    "title": "で — location of action / means / material",
    "rules": [
      {
        "id": "DE-1",
        "kind": "structural",
        "pattern": "[N-place] + で + [action/event predicate]",
        "gloss": "Location of an action or event. Ordinary existence uses に, but event-location で + ある is valid: 公園でコンサートがあります.",
        "examples": [
          {
            "jp": "図書館で勉強します。",
            "breakdown": "[図書館] で [勉強します]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "DE-2",
        "kind": "structural",
        "pattern": "[N-instrument/method] + で + [V]",
        "gloss": "Marks a tool, vehicle or method.",
        "examples": [
          {
            "jp": "バスで行きます。 ペンで書きます。",
            "breakdown": "[バス] で [行きます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "DE-3",
        "kind": "structural",
        "pattern": "[N-material] + で + [できている | 作る]",
        "gloss": "Marks the material used to make something.",
        "examples": [
          {
            "jp": "このいすは木でできています。",
            "breakdown": "[木] で [できています]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      }
    ],
    "groupNotes": [
      "で also marks causes (病気で休みました). This reference is a beginner scope, not an official JLPT item list.",
      "Don’t confuse particle で with the copula te-form で (学生で、先生です — connecting nouns/な-adjectives) — same shape, different job entirely."
    ]
  },
  {
    "particle": "と",
    "title": "と — listing / accompaniment / quotation",
    "rules": [
      {
        "id": "TO-1",
        "kind": "structural",
        "pattern": "[N] + と + [N]",
        "gloss": "Joins the nouns being presented as a list. Unlike や, it does not explicitly present them as examples from a larger set.",
        "examples": [
          {
            "jp": "すしとてんぷらを食べます。",
            "breakdown": "[すし] と [てんぷら]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/047.html"
          ]
        }
      },
      {
        "id": "TO-2",
        "kind": "structural",
        "pattern": "[N-person] + と + [V]",
        "gloss": "Accompaniment.",
        "examples": [
          {
            "jp": "友達と映画を見ます。",
            "breakdown": "[友達] と [見ます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "TO-3",
        "kind": "structural",
        "pattern": "[quoted content / plain clause] + と + [言う・思う…]",
        "gloss": "Introduces quoted content. Indirect opinion clauses use plain predicates: V-plain, ADJ-i, Nだ or ADJ-naだ. Direct quotations can retain their original register.",
        "examples": [
          {
            "jp": "明日雨が降ると思います。",
            "breakdown": "[明日雨が降る] と [思います]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/077.html"
          ]
        }
      }
    ],
    "groupNotes": [
      "と同じ／と違う (comparison) and conditional と (V-plain + と + CL, \"when/if X, then Y\") are real but structurally different from these three — worth keeping as separate grammar-tab entries later rather than folding into TO-1/2/3."
    ]
  },
  {
    "particle": "も",
    "title": "も — also/too",
    "rules": [
      {
        "id": "MO-1",
        "kind": "structural",
        "pattern": "[N] + も + [PRED]",
        "gloss": "Replaces は/が/を the same way は does; stacks after に/で/と/から/まで.",
        "examples": [
          {
            "jp": "わたしも学生です。",
            "breakdown": ""
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      }
    ],
    "groupNotes": [
      "Interrogative + も + negative predicate = total negation — 何もありません (nothing), だれも来ません (nobody came)."
    ]
  },
  {
    "particle": "の",
    "title": "の — possessive / nominalizer",
    "rules": [
      {
        "id": "NO-1",
        "kind": "structural",
        "pattern": "[N] + の + [N]",
        "gloss": "Possession or noun-modifying-noun.",
        "examples": [
          {
            "jp": "わたしの本です。",
            "breakdown": "[わたし] の [本]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/008.html"
          ]
        }
      },
      {
        "id": "NO-2",
        "kind": "structural",
        "pattern": "[plain clause] + の → noun phrase (e.g. [泳ぐの] + が + 好きです)",
        "gloss": "Nominalizes a clause. Verb/i-adjective predicates use plain forms; noun/na-adjective predicates use な before の.",
        "examples": [
          {
            "jp": "泳ぐのが好きです。",
            "breakdown": "[泳ぐ] の [が好きです]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/080.html"
          ]
        }
      }
    ],
    "groupNotes": [
      "Explanatory の in speech (どうしたんですか) and pronominal の standing in for an already-mentioned noun (赤いのをください — \"the red one\") are both common at N5 but are their own patterns, not this connector."
    ]
  },
  {
    "particle": "から",
    "title": "から — starting point / reason",
    "rules": [
      {
        "id": "KARA-1",
        "kind": "structural",
        "pattern": "[N] + から + [PRED]",
        "gloss": "Spatial or temporal starting point, often paired with まで.",
        "examples": [
          {
            "jp": "九時から始まります。",
            "breakdown": "[九時] から [始まります]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "id": "KARA-2",
        "kind": "structural",
        "pattern": "[CL] + から + [CL]",
        "gloss": "Reason/cause — attaches after a full predicate (plain or polite), not a bare noun.",
        "examples": [
          {
            "jp": "忙しいから、行きません。",
            "breakdown": "[忙しい] から [行きません]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/081.html"
          ]
        }
      }
    ],
    "groupNotes": [
      "もらう’s source can be marked から instead of に (田中さんからもらいました)."
    ]
  },
  {
    "particle": "まで",
    "title": "まで — endpoint",
    "rules": [
      {
        "id": "MADE-1",
        "kind": "structural",
        "pattern": "[N-place/time] + まで + [PRED]",
        "gloss": "Marks an endpoint in time, place or range.",
        "examples": [
          {
            "jp": "五時まで働きます。",
            "breakdown": "[五時] まで [働きます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "や",
    "title": "や — non-exhaustive listing",
    "rules": [
      {
        "id": "YA-1",
        "kind": "structural",
        "pattern": "[N] + や + [N]",
        "gloss": "Lists a few examples; implies others exist unlisted — opposite of TO-1. Often closed with など.",
        "examples": [
          {
            "jp": "机の上に本やペンがあります。",
            "breakdown": "[本] や [ペン]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/048.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "か",
    "title": "か — question / alternative / indefinite",
    "rules": [
      {
        "id": "KA-1",
        "kind": "final",
        "pattern": "[CL] + か (sentence-final)",
        "gloss": "Turns a statement into a question.",
        "examples": [
          {
            "jp": "これは本ですか。",
            "breakdown": ""
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/096.html"
          ]
        }
      },
      {
        "id": "KA-2",
        "kind": "structural",
        "pattern": "[N] + か + [N]",
        "gloss": "\"Or\" between alternatives.",
        "examples": [
          {
            "jp": "コーヒーか紅茶がほしいです。",
            "breakdown": "[コーヒー] か [紅茶]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ar/vmod/v_search_detail.php?id=171&ls=1.43%2C%E9%A3%9F%E6%96%99&rf=2"
          ]
        }
      },
      {
        "id": "KA-3",
        "kind": "structural",
        "pattern": "[interrogative] + か",
        "gloss": "Forms an indefinite pronoun — 何か (something), だれか (someone), どこか (somewhere) — not a real question.",
        "examples": [
          {
            "jp": "何か食べましたか。",
            "breakdown": "[何] + か = something"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/096.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "ね",
    "title": "ね — seeking agreement",
    "rules": [
      {
        "id": "NE-1",
        "kind": "final",
        "pattern": "[CL] + ね (sentence-final)",
        "gloss": "Softener seeking agreement/confirmation — \"right?\", \"isn’t it?\".",
        "examples": [
          {
            "jp": "いい天気ですね。",
            "breakdown": ""
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/096.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "よ",
    "title": "よ — asserting information",
    "rules": [
      {
        "id": "YO-1",
        "kind": "final",
        "pattern": "[CL] + よ (sentence-final)",
        "gloss": "Tells the listener something they may not know, or emphasizes.",
        "examples": [
          {
            "jp": "これはおいしいですよ。",
            "breakdown": ""
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/096.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "へ",
    "title": "へ — direction",
    "rules": [
      {
        "id": "HE-1",
        "kind": "structural",
        "pattern": "[N-place] + へ + [V-motion: 行く・来る・帰る]",
        "gloss": "Pronounced e as a particle. This beginner pattern marks direction/destination; に covers additional roles such as existence and time.",
        "examples": [
          {
            "jp": "日本へ行きます。",
            "breakdown": "[日本] へ [行きます]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "だけ",
    "title": "だけ — only (neutral)",
    "rules": [
      {
        "id": "DAKE-1",
        "kind": "structural",
        "pattern": "[N] + だけ + [PRED]",
        "gloss": "No polarity requirement — works with affirmative or negative predicates.",
        "examples": [
          {
            "jp": "一つだけください。",
            "breakdown": "[一つ] だけ [ください]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "しか",
    "title": "しか — only (negative-obligatory)",
    "rules": [
      {
        "id": "SHIKA-1",
        "kind": "structural",
        "pattern": "[N] + しか + [PRED, negative]",
        "gloss": "In this ordinary restrictive pattern, しか pairs with a negative predicate to mean nothing except the marked item.",
        "examples": [
          {
            "jp": "一つしかありません。",
            "breakdown": "[一つ] しか [ありません]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "より",
    "title": "より — comparison",
    "rules": [
      {
        "id": "YORI-1",
        "kind": "structural",
        "pattern": "[comparison baseline] + より + [comparative statement]",
        "gloss": "Marks what is used as the comparison baseline.",
        "examples": [
          {
            "jp": "東京は大阪より大きいです。",
            "breakdown": "[大阪] より [東京は大きいです]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      }
    ]
  },
  {
    "particle": "ぐらい／くらい",
    "title": "ぐらい／くらい — approximation",
    "rules": [
      {
        "id": "GURAI-1",
        "kind": "structural",
        "pattern": "[N-quantity/time] + ぐらい／くらい + [PRED]",
        "gloss": "Marks an approximate amount or duration in these examples.",
        "examples": [
          {
            "jp": "三時間ぐらいかかります。",
            "breakdown": "[三時間] ぐらい [かかります]"
          }
        ],
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "Common beginner pattern; not an exhaustive usage rule.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      }
    ]
  }
];
