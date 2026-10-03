/* Beginner examples with explicit scope and source review. See docs/LANGUAGE-SOURCES.md. */
const GRAMMAR_LESSONS = [
  {
    "stage": "Start here — the four you cannot avoid",
    "blurb": "Almost every simple Japanese sentence uses at least one of these. Learn them in this order.",
    "items": [
      {
        "particle": "は",
        "say": "pronounced \"wa\" here",
        "job": "Announces the topic.",
        "plain": "Place は after what you are talking about. The rest comments on it; は can also mark contrast.",
        "examples": [
          {
            "jp": "わたしは がくせいです。",
            "reading": "わたし は がくせい です",
            "parts": [
              [
                "わたし",
                "I"
              ],
              [
                "は",
                "← the topic is this"
              ],
              [
                "がくせい",
                "student"
              ],
              [
                "です",
                "am / is"
              ]
            ],
            "en": "I am a student.",
            "pl": "Jestem uczniem lub studentem."
          },
          {
            "jp": "この ほんは おもしろいです。",
            "reading": "この ほん は おもしろい です",
            "parts": [
              [
                "この ほん",
                "this book"
              ],
              [
                "は",
                "← the topic is this"
              ],
              [
                "おもしろいです",
                "is interesting"
              ]
            ],
            "en": "This book is interesting.",
            "pl": "Ta książka jest interesująca."
          }
        ],
        "watch": "As a particle は is pronounced wa. Topic choice depends on context, not just word order.",
        "pl": {
          "job": "Wprowadza temat.",
          "plain": "Postaw は po tym, o czym mówisz. Dalsza część zdania komentuje temat; は może także wprowadzać kontrast.",
          "watch": "Jako partykułę は czytamy wa. Wybór tematu zależy od kontekstu.",
          "say": "czytane tutaj wa"
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      },
      {
        "particle": "が",
        "job": "Identifies a subject or target.",
        "plain": "が identifies who or what the predicate concerns. It also occurs with liking and ability.",
        "examples": [
          {
            "jp": "だれが きますか。",
            "reading": "だれ が きます か",
            "parts": [
              [
                "だれ",
                "who"
              ],
              [
                "が",
                "← the one doing it"
              ],
              [
                "きます",
                "comes"
              ],
              [
                "か",
                "(question)"
              ]
            ],
            "en": "Who is coming?",
            "pl": "Kto przychodzi?"
          },
          {
            "jp": "ねこが います。",
            "reading": "ねこ が います",
            "parts": [
              [
                "ねこ",
                "cat"
              ],
              [
                "が",
                "← the one that exists"
              ],
              [
                "います",
                "there is (living thing)"
              ]
            ],
            "en": "There is a cat.",
            "pl": "Jest kot."
          }
        ],
        "watch": "は and が often fit the same sentence structure. Their meaning depends on context; new versus known information is only a starting guideline.",
        "pl": {
          "job": "Wskazuje podmiot lub przedmiot zainteresowania.",
          "plain": "が wskazuje, kogo lub czego dotyczy orzeczenie. Występuje też przy lubieniu i umiejętnościach.",
          "watch": "は i が często pasują do tej samej struktury. Nowa i znana informacja to tylko wskazówka; znaczenie zależy od kontekstu."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html",
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/082.html"
          ]
        }
      },
      {
        "particle": "を",
        "say": "pronounced \"o\"",
        "job": "Marks an object, route or departure point.",
        "plain": "For actions such as eating and reading, を marks the object. With movement verbs it can mark the route or what you leave.",
        "examples": [
          {
            "jp": "ごはんを たべます。",
            "reading": "ごはん を たべます",
            "parts": [
              [
                "ごはん",
                "rice / a meal"
              ],
              [
                "を",
                "← the thing acted on"
              ],
              [
                "たべます",
                "eat"
              ]
            ],
            "en": "I eat a meal.",
            "pl": "Jem posiłek."
          },
          {
            "jp": "みずを のみました。",
            "reading": "みず を のみました",
            "parts": [
              [
                "みず",
                "water"
              ],
              [
                "を",
                "← the thing acted on"
              ],
              [
                "のみました",
                "drank"
              ]
            ],
            "en": "I drank water.",
            "pl": "Wypiłem wodę."
          }
        ],
        "watch": "家を出る means leave the house; 道を歩く means walk along a road. を is pronounced o.",
        "pl": {
          "job": "Oznacza dopełnienie, trasę lub punkt wyjścia.",
          "plain": "Przy jedzeniu czy czytaniu を oznacza przedmiot czynności. Przy ruchu może wskazywać trasę albo miejsce, które opuszczamy.",
          "watch": "家を出る to wyjść z domu, a 道を歩く — iść drogą. を czytamy o.",
          "say": "czytane tutaj wa"
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "particle": "に",
        "job": "Marks a point or destination.",
        "plain": "These examples use に for a time point, destination or location of existence. It can also mark recipients and other relations.",
        "examples": [
          {
            "jp": "しちじに おきます。",
            "reading": "しちじ に おきます",
            "parts": [
              [
                "しちじ",
                "seven o’clock"
              ],
              [
                "に",
                "← at this point in time"
              ],
              [
                "おきます",
                "get up"
              ]
            ],
            "en": "I get up at seven.",
            "pl": "Wstaję o siódmej."
          },
          {
            "jp": "がっこうに いきます。",
            "reading": "がっこう に いきます",
            "parts": [
              [
                "がっこう",
                "school"
              ],
              [
                "に",
                "← to this destination"
              ],
              [
                "いきます",
                "go"
              ]
            ],
            "en": "I go to school.",
            "pl": "Idę do szkoły."
          },
          {
            "jp": "へやに いすが あります。",
            "reading": "へや に いす が あります",
            "parts": [
              [
                "へや",
                "room"
              ],
              [
                "に",
                "← where it exists"
              ],
              [
                "いす",
                "chair"
              ],
              [
                "が",
                "(subject)"
              ],
              [
                "あります",
                "there is"
              ]
            ],
            "en": "There is a chair in the room.",
            "pl": "W pokoju jest krzesło."
          }
        ],
        "watch": "三時に is a specific time. 今日 and 明日 usually have no に in simple scheduling statements.",
        "pl": {
          "job": "Wskazuje punkt lub cel.",
          "plain": "W tych przykładach に oznacza moment, cel ruchu albo miejsce istnienia. Może też wskazywać odbiorcę i inne relacje.",
          "watch": "三時に wskazuje konkretną godzinę. W prostych zdaniach o planach 今日 i 明日 zwykle nie wymagają に."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html",
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/029.html"
          ]
        }
      }
    ],
    "stage_pl": "Zacznij tutaj — cztery podstawowe partykuły",
    "blurb_pl": "Typowe użycia w prostych zdaniach; każda partykuła ma też inne zastosowania."
  },
  {
    "stage": "Places, tools and companions",
    "blurb": "The next layer: where something happens, what you did it with, and who you did it with.",
    "items": [
      {
        "particle": "で",
        "job": "Marks an action/event location or a means.",
        "plain": "で marks where an action or event takes place, or a tool, method or vehicle.",
        "examples": [
          {
            "jp": "としょかんで べんきょうします。",
            "reading": "としょかん で べんきょうします",
            "parts": [
              [
                "としょかん",
                "library"
              ],
              [
                "で",
                "← where it happens"
              ],
              [
                "べんきょうします",
                "study"
              ]
            ],
            "en": "I study at the library.",
            "pl": "Uczę się w bibliotece."
          },
          {
            "jp": "でんしゃで いきます。",
            "reading": "でんしゃ で いきます",
            "parts": [
              [
                "でんしゃ",
                "train"
              ],
              [
                "で",
                "← by this means"
              ],
              [
                "いきます",
                "go"
              ]
            ],
            "en": "I go by train.",
            "pl": "Jadę pociągiem."
          }
        ],
        "watch": "Existence normally uses に. Events can use で with ある: 公園でコンサートがあります is valid.",
        "pl": {
          "job": "Oznacza miejsce działania lub środek.",
          "plain": "で wskazuje miejsce czynności lub wydarzenia, narzędzie, sposób albo środek transportu.",
          "watch": "Istnienie zwykle opisujemy z に. Wydarzenia dopuszczają で z ある: 公園でコンサートがあります jest poprawne."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "particle": "へ",
        "say": "pronounced \"e\"",
        "job": "Marks direction.",
        "plain": "へ marks where you are heading. In simple destination examples, に is often possible too.",
        "examples": [
          {
            "jp": "にほんへ いきます。",
            "reading": "にほん へ いきます",
            "parts": [
              [
                "にほん",
                "Japan"
              ],
              [
                "へ",
                "← heading that way"
              ],
              [
                "いきます",
                "go"
              ]
            ],
            "en": "I am going to Japan.",
            "pl": "Jadę do Japonii."
          }
        ],
        "watch": "As this particle, へ is pronounced e.",
        "pl": {
          "job": "Wskazuje kierunek.",
          "plain": "へ oznacza, dokąd zmierzamy. W prostych przykładach celu podróży często można też użyć に.",
          "watch": "Jako tę partykułę へ czytamy e.",
          "say": "czytane tutaj wa"
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "particle": "と",
        "job": "Lists nouns, marks a companion or quotes content.",
        "plain": "These examples show noun listing and accompaniment. と also introduces quotations or thoughts.",
        "examples": [
          {
            "jp": "パンと たまごを かいました。",
            "reading": "パン と たまご を かいました",
            "parts": [
              [
                "パン",
                "bread"
              ],
              [
                "と",
                "← and"
              ],
              [
                "たまご",
                "egg"
              ],
              [
                "を",
                "(object)"
              ],
              [
                "かいました",
                "bought"
              ]
            ],
            "en": "I bought bread and eggs.",
            "pl": "Kupiłem chleb i jajka."
          },
          {
            "jp": "ともだちと いきます。",
            "reading": "ともだち と いきます",
            "parts": [
              [
                "ともだち",
                "friend"
              ],
              [
                "と",
                "← together with"
              ],
              [
                "いきます",
                "go"
              ]
            ],
            "en": "I am going with a friend.",
            "pl": "Idę z przyjacielem."
          }
        ],
        "watch": "雨が降ると思います means I think it will rain. For I ate and drank, use verb て forms rather than listing と.",
        "pl": {
          "job": "Łączy rzeczowniki, wskazuje towarzysza lub cytuje.",
          "plain": "Te przykłady pokazują wyliczanie i towarzyszenie. と wprowadza także cytat lub myśl.",
          "watch": "雨が降ると思います znaczy myślę, że będzie padać. Łączenie czynności, np. jadłem i piłem, wymaga form て, a nie wyliczającego と."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/047.html",
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html",
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/077.html"
          ]
        }
      },
      {
        "particle": "や",
        "job": "Lists examples.",
        "plain": "や presents some items from a larger set, often with など.",
        "examples": [
          {
            "jp": "ほんや ノートが あります。",
            "reading": "ほん や ノート が あります",
            "parts": [
              [
                "ほん",
                "books"
              ],
              [
                "や",
                "← and, among others"
              ],
              [
                "ノート",
                "notebooks"
              ],
              [
                "が",
                "(subject)"
              ],
              [
                "あります",
                "there are"
              ]
            ],
            "en": "There are books and notebooks (and other things).",
            "pl": "Są książki, zeszyty i inne rzeczy."
          }
        ],
        "watch": "と lists the named items; や explicitly suggests other items as well.",
        "pl": {
          "job": "Wylicza przykłady.",
          "plain": "や podaje wybrane elementy większego zbioru, często z など.",
          "watch": "と wylicza wskazane elementy; や sugeruje, że są też inne."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/048.html"
          ]
        }
      }
    ],
    "stage_pl": "Miejsca, narzędzia i towarzysze",
    "blurb_pl": "Wskazuj miejsce, sposób i towarzysza."
  },
  {
    "stage": "Linking and limiting",
    "blurb": "Connecting nouns, setting ranges, and narrowing things down.",
    "items": [
      {
        "particle": "の",
        "job": "Relates nouns or nominalizes a clause.",
        "plain": "In AのB, A describes B: ownership, subject matter, origin and other relations.",
        "examples": [
          {
            "jp": "わたしの ほん",
            "reading": "わたし の ほん",
            "parts": [
              [
                "わたし",
                "I / me"
              ],
              [
                "の",
                "← belonging to"
              ],
              [
                "ほん",
                "book"
              ]
            ],
            "en": "my book",
            "pl": "moja książka"
          },
          {
            "jp": "にほんごの せんせい",
            "reading": "にほんご の せんせい",
            "parts": [
              [
                "にほんご",
                "Japanese language"
              ],
              [
                "の",
                "← of / relating to"
              ],
              [
                "せんせい",
                "teacher"
              ]
            ],
            "en": "a Japanese teacher (teacher of Japanese)",
            "pl": "nauczyciel języka japońskiego"
          }
        ],
        "watch": "泳ぐのが好きです uses の to make swimming a noun phrase. Not every の expresses ownership.",
        "pl": {
          "job": "Łączy rzeczowniki lub nominalizuje zdanie.",
          "plain": "W AのB człon A opisuje B: właściciela, temat, pochodzenie lub inną relację.",
          "watch": "W 泳ぐのが好きです の zmienia pływanie w wyrażenie rzeczownikowe. Nie każde の oznacza własność."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/008.html",
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/080.html"
          ]
        }
      },
      {
        "particle": "から",
        "job": "Marks a starting point or a reason.",
        "plain": "After a place or time, から marks the start; it often pairs with まで.",
        "examples": [
          {
            "jp": "くじから はたらきます。",
            "reading": "くじ から はたらきます",
            "parts": [
              [
                "くじ",
                "nine o’clock"
              ],
              [
                "から",
                "← starting from"
              ],
              [
                "はたらきます",
                "work"
              ]
            ],
            "en": "I work from nine.",
            "pl": "Pracuję od dziewiątej."
          }
        ],
        "watch": "After a clause, から can give a reason. Noun and na-adjective reasons normally need だ/です before から.",
        "pl": {
          "job": "Wskazuje początek lub przyczynę.",
          "plain": "Po miejscu lub czasie から oznacza początek; często łączy się z まで.",
          "watch": "Po zdaniu から może oznaczać przyczynę. Przy rzeczowniku i przymiotniku な zwykle występuje wcześniej だ lub です."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html",
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/081.html"
          ]
        }
      },
      {
        "particle": "まで",
        "job": "Marks an endpoint.",
        "plain": "まで marks how far something extends in place or time.",
        "examples": [
          {
            "jp": "ごじまで べんきょうしました。",
            "reading": "ごじ まで べんきょうしました",
            "parts": [
              [
                "ごじ",
                "five o’clock"
              ],
              [
                "まで",
                "← up until"
              ],
              [
                "べんきょうしました",
                "studied"
              ]
            ],
            "en": "I studied until five.",
            "pl": "Uczyłem się do piątej."
          }
        ],
        "watch": "九時から五時まで means from nine until five. These examples show the endpoint use.",
        "pl": {
          "job": "Wskazuje punkt końcowy.",
          "plain": "まで określa zasięg w przestrzeni lub czasie.",
          "watch": "九時から五時まで znaczy od dziewiątej do piątej. Te przykłady pokazują użycie wskazujące koniec."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "particle": "も",
        "job": "Adds also or too.",
        "plain": "も adds another item to what is being said. In these examples it replaces は/が/を.",
        "examples": [
          {
            "jp": "わたしも いきます。",
            "reading": "わたし も いきます",
            "parts": [
              [
                "わたし",
                "I"
              ],
              [
                "も",
                "← me too"
              ],
              [
                "いきます",
                "go"
              ]
            ],
            "en": "I am going too.",
            "pl": "Ja też idę."
          }
        ],
        "watch": "It can follow other particles: 学校にも. These patterns do not use はも/がも/をも.",
        "pl": {
          "job": "Dodaje też lub również.",
          "plain": "も dodaje kolejny element do wypowiedzi. W tych przykładach zastępuje は, が lub を.",
          "watch": "Może występować po innych partykułach: 学校にも. W tych konstrukcjach nie używamy はも, がも ani をも."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      },
      {
        "particle": "だけ",
        "job": "Limits to only.",
        "plain": "だけ limits the item or amount without requiring a negative predicate.",
        "examples": [
          {
            "jp": "ひとつだけ ください。",
            "reading": "ひとつ だけ ください",
            "parts": [
              [
                "ひとつ",
                "one (thing)"
              ],
              [
                "だけ",
                "← only"
              ],
              [
                "ください",
                "please give me"
              ]
            ],
            "en": "Just one, please.",
            "pl": "Tylko jedną sztukę, proszę."
          }
        ],
        "watch": "It can occur in affirmative or negative statements; contrast restrictive しか〜ない.",
        "pl": {
          "job": "Ogranicza do tylko.",
          "plain": "だけ ogranicza wskazany element lub ilość, bez wymogu przeczącego orzeczenia.",
          "watch": "Może występować w zdaniach twierdzących i przeczących; porównaj ograniczające しか〜ない."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      },
      {
        "particle": "しか",
        "job": "Expresses nothing except.",
        "plain": "In the ordinary restrictive pattern, しか pairs with a negative predicate.",
        "examples": [
          {
            "jp": "ひとつしか ありません。",
            "reading": "ひとつ しか ありません",
            "parts": [
              [
                "ひとつ",
                "one"
              ],
              [
                "しか",
                "← only"
              ],
              [
                "ありません",
                "there is not"
              ]
            ],
            "en": "There is only one.",
            "pl": "Jest tylko jedna sztuka."
          }
        ],
        "watch": "一つしかありません means there is only one. Practise しか together with its negative ending.",
        "pl": {
          "job": "Wyraża nic poza.",
          "plain": "W zwykłym użyciu ograniczającym しか łączy się z przeczącym orzeczeniem.",
          "watch": "一つしかありません oznacza jest tylko jedna rzecz. Ćwicz しか razem z przeczącą końcówką."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      },
      {
        "particle": "より",
        "job": "Marks a comparison baseline.",
        "plain": "Put より after what you compare against. The following predicate says how the other item differs.",
        "examples": [
          {
            "jp": "とうきょうは おおさかより おおきいです。",
            "reading": "とうきょう は おおさか より おおきい です",
            "parts": [
              [
                "とうきょう",
                "Tokyo"
              ],
              [
                "は",
                "(topic)"
              ],
              [
                "おおさか",
                "Osaka"
              ],
              [
                "より",
                "← compared to"
              ],
              [
                "おおきいです",
                "is big"
              ]
            ],
            "en": "Tokyo is bigger than Osaka.",
            "pl": "Tokio jest większe od Osaki."
          }
        ],
        "watch": "The baseline is not necessarily a loser: the comparison can be smaller, cheaper or negative.",
        "pl": {
          "job": "Wskazuje punkt odniesienia w porównaniu.",
          "plain": "Postaw より po tym, z czym porównujesz. Orzeczenie mówi, czym różni się drugi element.",
          "watch": "Punkt odniesienia nie musi być przegranym: porównanie może dotyczyć mniejszości, niższej ceny albo mieć przeczenie."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html"
          ]
        }
      },
      {
        "particle": "ぐらい／くらい",
        "job": "Makes an amount approximate.",
        "plain": "These examples use ぐらい or くらい for approximate quantities and durations.",
        "examples": [
          {
            "jp": "さんじかんぐらい かかります。",
            "reading": "さんじかん ぐらい かかります",
            "parts": [
              [
                "さんじかん",
                "three hours"
              ],
              [
                "ぐらい",
                "← about"
              ],
              [
                "かかります",
                "it takes"
              ]
            ],
            "en": "It takes about three hours.",
            "pl": "Zajmuje to około trzech godzin."
          }
        ],
        "watch": "For an approximate clock time, beginner materials usually use ごろ, as in 三時ごろ.",
        "pl": {
          "job": "Przybliża ilość.",
          "plain": "Te przykłady używają ぐらい lub くらい przy przybliżonej ilości i długości czasu.",
          "watch": "Przy przybliżonej godzinie w materiałach dla początkujących zwykle używa się ごろ: 三時ごろ."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/095.html"
          ]
        }
      }
    ],
    "stage_pl": "Łączenie i ograniczanie",
    "blurb_pl": "Łącz pojęcia i określaj zakres."
  },
  {
    "stage": "Ending a sentence",
    "blurb": "These go at the very end and change the tone rather than the structure.",
    "items": [
      {
        "particle": "か",
        "job": "Marks a question.",
        "plain": "In polite beginner questions, add か after the polite predicate.",
        "examples": [
          {
            "jp": "がくせいですか。",
            "reading": "がくせい です か",
            "parts": [
              [
                "がくせい",
                "student"
              ],
              [
                "です",
                "are"
              ],
              [
                "か",
                "← makes it a question"
              ]
            ],
            "en": "Are you a student?",
            "pl": "Czy jesteś uczniem lub studentem?"
          }
        ],
        "watch": "Casual questions differ: noun/na-adjective questions normally drop だ. This lesson practises polite ですか/ますか.",
        "pl": {
          "job": "Oznacza pytanie.",
          "plain": "W grzecznych pytaniach dla początkujących dodaj か po grzecznym orzeczeniu.",
          "watch": "Pytania potoczne różnią się: przy rzeczowniku i przymiotniku な zwykle pomijamy だ. Tu ćwiczymy grzeczne ですか i ますか."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/096.html"
          ]
        }
      },
      {
        "particle": "ね",
        "job": "Seeks confirmation or shared feeling.",
        "plain": "ね invites agreement or confirms something with the listener.",
        "examples": [
          {
            "jp": "いい てんきですね。",
            "reading": "いい てんき です ね",
            "parts": [
              [
                "いい てんき",
                "good weather"
              ],
              [
                "です",
                "is"
              ],
              [
                "ね",
                "← right?"
              ]
            ],
            "en": "Nice weather, isn’t it?",
            "pl": "Ładna pogoda, prawda?"
          }
        ],
        "watch": "Its effect depends on the situation and tone; it is not a universal politeness marker.",
        "pl": {
          "job": "Szuka potwierdzenia lub wspólnej oceny.",
          "plain": "ね zaprasza do zgody albo potwierdza informację z rozmówcą.",
          "watch": "Efekt zależy od sytuacji i tonu; nie jest to uniwersalny znacznik grzeczności."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/096.html"
          ]
        }
      },
      {
        "particle": "よ",
        "job": "Draws attention to information.",
        "plain": "よ emphasizes what the speaker tells the listener.",
        "examples": [
          {
            "jp": "あしたは やすみですよ。",
            "reading": "あした は やすみ です よ",
            "parts": [
              [
                "あした",
                "tomorrow"
              ],
              [
                "は",
                "(topic)"
              ],
              [
                "やすみ",
                "day off"
              ],
              [
                "です",
                "is"
              ],
              [
                "よ",
                "← letting you know"
              ]
            ],
            "en": "Tomorrow is a day off, you know.",
            "pl": "Jutro jest dzień wolny."
          }
        ],
        "watch": "It can sound insistent or corrective. Use it with attention to the relationship and tone.",
        "pl": {
          "job": "Zwraca uwagę na informację.",
          "plain": "よ podkreśla to, co przekazujesz rozmówcy.",
          "watch": "Może brzmieć stanowczo lub korygująco. Zwracaj uwagę na relację i ton."
        },
        "review": {
          "status": "pattern-reviewed",
          "date": "2026-10-04",
          "scope": "These examples show selected uses, not all uses.",
          "sources": [
            "https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/096.html"
          ]
        }
      }
    ],
    "stage_pl": "Zakończenie zdania",
    "blurb_pl": "Przekazuj pytania, potwierdzenie i nacisk."
  }
];
window.GRAMMAR_LESSONS = GRAMMAR_LESSONS;
