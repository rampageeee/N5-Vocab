/* ============================================================
   GRAMMAR LESSONS  (learner-facing reference content)

   This is NOT a replacement for js/grammar-rules.js. That file is the
   checker's canon — formal patterns, rule IDs, category notation — and it
   stays exactly as it is, reachable from the "Rules" tab. It is precise and
   it is unreadable for a beginner, and those two things are not in conflict:
   it was written for a parser, and then shown to a person.

   This file is the same grammar written for someone meeting it for the
   first time. The differences are deliberate:

     · Ordered by what to learn first, not alphabetically by particle.
     · Every entry opens with a plain sentence saying what the particle
       DOES, before any structure or terminology appears.
     · Examples carry a kana reading, a chunk-by-chunk gloss, and a natural
       translation — so a learner can see which piece did which job instead
       of being handed a bracket notation and a legend to memorise first.
     · Each entry names the specific mistake beginners actually make with
       that particle, because knowing the rule and knowing the trap are
       different pieces of knowledge.

   ACCURACY NOTE: content here should be checked by a fluent speaker before
   it is trusted as study material. The structures are standard N5 and the
   examples are conventional textbook sentences, but "standard" is not the
   same as "verified", and a learning app that is confidently wrong is worse
   than one that says nothing.
   ============================================================ */

const GRAMMAR_LESSONS = [
  {
    stage: 'Start here — the four you cannot avoid',
    blurb: 'Almost every simple Japanese sentence uses at least one of these. Learn them in this order.',
    items: [

      {
        particle: 'は',
        say: 'pronounced "wa" here',
        job: 'Announces what the sentence is about.',
        plain: 'Put は after the thing you want to talk about. Everything that follows is what you are saying about it. English has no single word for this — the closest feeling is "as for ___,".',
        examples: [
          {
            jp: 'わたしは がくせいです。',
            reading: 'わたし は がくせい です',
            parts: [['わたし', 'I'], ['は', '← the topic is this'], ['がくせい', 'student'], ['です', 'am / is']],
            en: 'I am a student.'
          },
          {
            jp: 'この ほんは おもしろいです。',
            reading: 'この ほん は おもしろい です',
            parts: [['この ほん', 'this book'], ['は', '← the topic is this'], ['おもしろいです', 'is interesting']],
            en: 'This book is interesting.'
          }
        ],
        watch: 'Written は, but when it is this particle it is pronounced "wa". Everywhere else は is "ha". This trips up every beginner and then stops being a problem.'
      },

      {
        particle: 'が',
        job: 'Points at who or what is doing something.',
        plain: 'が marks the subject when you are identifying it — answering "who?" or "what?". Use it when the information is new, or when the sentence is pointing something out rather than commenting on a known topic.',
        examples: [
          {
            jp: 'だれが きますか。',
            reading: 'だれ が きます か',
            parts: [['だれ', 'who'], ['が', '← the one doing it'], ['きます', 'comes'], ['か', '(question)']],
            en: 'Who is coming?'
          },
          {
            jp: 'ねこが います。',
            reading: 'ねこ が います',
            parts: [['ねこ', 'cat'], ['が', '← the one that exists'], ['います', 'there is (living thing)']],
            en: 'There is a cat.'
          }
        ],
        watch: 'は versus が is the single hardest thing at this level, and it is not a rule you can look up — both are often grammatically fine and the difference is about emphasis. Rough starting guide: が introduces, は comments on something already introduced. Do not expect to get this right early. Nobody does.'
      },

      {
        particle: 'を',
        say: 'pronounced "o"',
        job: 'Marks the thing an action is done to.',
        plain: 'If a verb acts on something — eat it, read it, buy it, drink it — put を after that thing.',
        examples: [
          {
            jp: 'ごはんを たべます。',
            reading: 'ごはん を たべます',
            parts: [['ごはん', 'rice / a meal'], ['を', '← the thing acted on'], ['たべます', 'eat']],
            en: 'I eat a meal.'
          },
          {
            jp: 'みずを のみました。',
            reading: 'みず を のみました',
            parts: [['みず', 'water'], ['を', '← the thing acted on'], ['のみました', 'drank']],
            en: 'I drank water.'
          }
        ],
        watch: 'を is only ever used as this particle — it never appears inside a word. So whenever you see it, it is doing this one job.'
      },

      {
        particle: 'に',
        job: 'Fixes a point — in time, or in space.',
        plain: 'に marks a specific point: a clock time, a date, a destination you arrive at, or a place where something simply exists. Think of it as landing on something rather than moving through it.',
        examples: [
          {
            jp: 'しちじに おきます。',
            reading: 'しちじ に おきます',
            parts: [['しちじ', 'seven o\u2019clock'], ['に', '← at this point in time'], ['おきます', 'get up']],
            en: 'I get up at seven.'
          },
          {
            jp: 'がっこうに いきます。',
            reading: 'がっこう に いきます',
            parts: [['がっこう', 'school'], ['に', '← to this destination'], ['いきます', 'go']],
            en: 'I go to school.'
          },
          {
            jp: 'へやに いすが あります。',
            reading: 'へや に いす が あります',
            parts: [['へや', 'room'], ['に', '← where it exists'], ['いす', 'chair'], ['が', '(subject)'], ['あります', 'there is']],
            en: 'There is a chair in the room.'
          }
        ],
        watch: 'Only put に on times that can be pointed at on a clock or calendar — 三時に, 月曜日に. Vague time words take nothing: きょう, あした, まいにち have no に.'
      }
    ]
  },

  {
    stage: 'Places, tools and companions',
    blurb: 'The next layer: where something happens, what you did it with, and who you did it with.',
    items: [

      {
        particle: 'で',
        job: 'Where an action happens, or what you used to do it.',
        plain: 'Two jobs, and they feel related once you see them together. で marks the setting an action takes place in, and it marks the tool, method or vehicle used.',
        examples: [
          {
            jp: 'としょかんで べんきょうします。',
            reading: 'としょかん で べんきょうします',
            parts: [['としょかん', 'library'], ['で', '← where it happens'], ['べんきょうします', 'study']],
            en: 'I study at the library.'
          },
          {
            jp: 'でんしゃで いきます。',
            reading: 'でんしゃ で いきます',
            parts: [['でんしゃ', 'train'], ['で', '← by this means'], ['いきます', 'go']],
            en: 'I go by train.'
          }
        ],
        watch: 'で versus に for places is the classic mix-up. If something HAPPENS there, use で. If something simply IS there, or you are arriving there, use に. 学校で勉強します (studying happens at school) but 学校に行きます (arriving at school).'
      },

      {
        particle: 'へ',
        say: 'pronounced "e"',
        job: 'Direction of travel.',
        plain: 'Marks which way you are heading. Very close to に for destinations, and in most beginner sentences either works — へ leans slightly more towards "towards", に slightly more towards "arriving at".',
        examples: [
          {
            jp: 'にほんへ いきます。',
            reading: 'にほん へ いきます',
            parts: [['にほん', 'Japan'], ['へ', '← heading that way'], ['いきます', 'go']],
            en: 'I am going to Japan.'
          }
        ],
        watch: 'Written へ, pronounced "e" when it is this particle — the same kind of spelling quirk as は.'
      },

      {
        particle: 'と',
        job: 'And, between nouns — or "together with".',
        plain: 'Joins nouns into a complete list, and also marks the person you did something with.',
        examples: [
          {
            jp: 'パンと たまごを かいました。',
            reading: 'パン と たまご を かいました',
            parts: [['パン', 'bread'], ['と', '← and'], ['たまご', 'egg'], ['を', '(object)'], ['かいました', 'bought']],
            en: 'I bought bread and eggs.'
          },
          {
            jp: 'ともだちと いきます。',
            reading: 'ともだち と いきます',
            parts: [['ともだち', 'friend'], ['と', '← together with'], ['いきます', 'go']],
            en: 'I am going with a friend.'
          }
        ],
        watch: 'と only joins nouns, never sentences or adjectives. "I ate and drank" does not use と — that needs the て form of the verb.'
      },

      {
        particle: 'や',
        job: 'And — but only a partial list.',
        plain: 'Like と, but it implies the list is not complete: these things among others.',
        examples: [
          {
            jp: 'ほんや ノートが あります。',
            reading: 'ほん や ノート が あります',
            parts: [['ほん', 'books'], ['や', '← and, among others'], ['ノート', 'notebooks'], ['が', '(subject)'], ['あります', 'there are']],
            en: 'There are books and notebooks (and other things).'
          }
        ],
        watch: 'Choosing や over と is a real difference in meaning, not a style choice. と says "these, and that is all".'
      }
    ]
  },

  {
    stage: 'Linking and limiting',
    blurb: 'Connecting nouns, setting ranges, and narrowing things down.',
    items: [

      {
        particle: 'の',
        job: 'Ties two nouns together — usually possession.',
        plain: 'A の B means the B that belongs to, comes from, or is defined by A. The owner goes first, opposite to English word order in some cases.',
        examples: [
          {
            jp: 'わたしの ほん',
            reading: 'わたし の ほん',
            parts: [['わたし', 'I / me'], ['の', '← belonging to'], ['ほん', 'book']],
            en: 'my book'
          },
          {
            jp: 'にほんごの せんせい',
            reading: 'にほんご の せんせい',
            parts: [['にほんご', 'Japanese language'], ['の', '← of / relating to'], ['せんせい', 'teacher']],
            en: 'a Japanese teacher (teacher of Japanese)'
          }
        ],
        watch: 'The order is always owner + の + owned. 先生の本 is the teacher\u2019s book; 本の先生 would be a "book\u2019s teacher", which is nonsense.'
      },

      {
        particle: 'から',
        job: 'From — a starting point.',
        plain: 'Marks where something starts, in time or in place. Often paired with まで.',
        examples: [
          {
            jp: 'くじから はたらきます。',
            reading: 'くじ から はたらきます',
            parts: [['くじ', 'nine o\u2019clock'], ['から', '← starting from'], ['はたらきます', 'work']],
            en: 'I work from nine.'
          }
        ],
        watch: 'から also means "because" when it follows a whole sentence rather than a noun. Same word, different job — the position tells you which.'
      },

      {
        particle: 'まで',
        job: 'Until, as far as — an end point.',
        plain: 'The other half of から. Marks where something stops.',
        examples: [
          {
            jp: 'ごじまで べんきょうしました。',
            reading: 'ごじ まで べんきょうしました',
            parts: [['ごじ', 'five o\u2019clock'], ['まで', '← up until'], ['べんきょうしました', 'studied']],
            en: 'I studied until five.'
          }
        ],
        watch: 'から and まで pair up naturally: 九時から五時まで, "from nine until five".'
      },

      {
        particle: 'も',
        job: 'Also, too.',
        plain: 'Replaces は, が or を to say "this one as well".',
        examples: [
          {
            jp: 'わたしも いきます。',
            reading: 'わたし も いきます',
            parts: [['わたし', 'I'], ['も', '← me too'], ['いきます', 'go']],
            en: 'I am going too.'
          }
        ],
        watch: 'も takes the place of は/が/を — it never stacks on them. わたしもいきます, never わたしはもいきます.'
      },

      {
        particle: 'だけ',
        job: 'Only, just that much.',
        plain: 'Limits to exactly that amount or that thing. The sentence stays positive.',
        examples: [
          {
            jp: 'ひとつだけ ください。',
            reading: 'ひとつ だけ ください',
            parts: [['ひとつ', 'one (thing)'], ['だけ', '← only'], ['ください', 'please give me']],
            en: 'Just one, please.'
          }
        ],
        watch: 'Compare with しか below — same English word "only", completely different sentence shape.'
      },

      {
        particle: 'しか',
        job: 'Only — and the verb must be negative.',
        plain: 'Means "nothing but", and the sentence has to end in a negative even though the meaning is positive in English.',
        examples: [
          {
            jp: 'ひとつしか ありません。',
            reading: 'ひとつ しか ありません',
            parts: [['ひとつ', 'one'], ['しか', '← only'], ['ありません', 'there is not']],
            en: 'There is only one.'
          }
        ],
        watch: 'A positive verb after しか is simply ungrammatical. If you want a positive sentence, use だけ instead.'
      },

      {
        particle: 'より',
        job: 'Than — comparison.',
        plain: 'A より B means B is more ___ than A. The thing being compared AGAINST comes before より.',
        examples: [
          {
            jp: 'とうきょうは おおさかより おおきいです。',
            reading: 'とうきょう は おおさか より おおきい です',
            parts: [['とうきょう', 'Tokyo'], ['は', '(topic)'], ['おおさか', 'Osaka'], ['より', '← compared to'], ['おおきいです', 'is big']],
            en: 'Tokyo is bigger than Osaka.'
          }
        ],
        watch: 'The order feels backwards coming from English. より attaches to the LOSER of the comparison.'
      },

      {
        particle: 'ぐらい／くらい',
        job: 'About, roughly.',
        plain: 'Softens a quantity or a length of time to an approximation. Both spellings are correct and interchangeable.',
        examples: [
          {
            jp: 'さんじかんぐらい かかります。',
            reading: 'さんじかん ぐらい かかります',
            parts: [['さんじかん', 'three hours'], ['ぐらい', '← about'], ['かかります', 'it takes']],
            en: 'It takes about three hours.'
          }
        ],
        watch: 'For approximate clock times use ごろ instead: 三時ごろ, "around three o\u2019clock". ぐらい is for durations and amounts.'
      }
    ]
  },

  {
    stage: 'Ending a sentence',
    blurb: 'These go at the very end and change the tone rather than the structure.',
    items: [

      {
        particle: 'か',
        job: 'Turns a statement into a question.',
        plain: 'Add か to the end. Nothing else changes — no word order shuffle, no question mark needed.',
        examples: [
          {
            jp: 'がくせいですか。',
            reading: 'がくせい です か',
            parts: [['がくせい', 'student'], ['です', 'are'], ['か', '← makes it a question']],
            en: 'Are you a student?'
          }
        ],
        watch: 'This is why Japanese questions often have no question mark — か is already doing that job.'
      },

      {
        particle: 'ね',
        job: 'Seeks agreement — "isn\u2019t it?"',
        plain: 'Invites the listener to agree with you. Warm and conversational.',
        examples: [
          {
            jp: 'いい てんきですね。',
            reading: 'いい てんき です ね',
            parts: [['いい てんき', 'good weather'], ['です', 'is'], ['ね', '← right?']],
            en: 'Nice weather, isn\u2019t it?'
          }
        ],
        watch: 'Very common in everyday speech. Overusing it in writing sounds odd.'
      },

      {
        particle: 'よ',
        job: 'Tells the listener something they did not know.',
        plain: 'Adds emphasis, or flags new information the listener probably lacks.',
        examples: [
          {
            jp: 'あしたは やすみですよ。',
            reading: 'あした は やすみ です よ',
            parts: [['あした', 'tomorrow'], ['は', '(topic)'], ['やすみ', 'day off'], ['です', 'is'], ['よ', '← letting you know']],
            en: 'Tomorrow is a day off, you know.'
          }
        ],
        watch: 'Can sound pushy if used to correct someone. ね softens, よ asserts.'
      }
    ]
  }
];

window.GRAMMAR_LESSONS = GRAMMAR_LESSONS;
