const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const {load, word} = require('./harness.cjs');
function setup() {
  const h = load(['sentence-practice']);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../www/data/beginner-sentences.js'),'utf8'),h.context);
  return {...h, practice:h.get('SentencePractice'), examples:h.get('SentenceExamples')};
}
test('starter set has aligned tokens, both translations and construction sources',()=>{
  const h=setup(); assert.equal(h.context.window.BEGINNER_SENTENCES.length,30);
  for(const x of h.context.window.BEGINNER_SENTENCES) {
    assert.equal(h.examples.aligned(x),true); assert.ok(x.en&&x.pl&&x.source);
  }
});
test('common beginner entries including する get vocabulary-restricted examples',()=>{
  const h=setup();
  for(const [k,r,pos,cls] of [['水','みず','noun'],['猫','ねこ','noun'],['する','する','verb','irregular'],['来る','くる','verb','irregular'],['食べる','たべる','verb','ichidan'],['見る','みる','verb','ichidan'],['いい','いい','i-adj'],['静か','しずか','na-adj']]) {
    const w=word(h.db,k,r,pos,{verb_class:cls,class_confirmed:!!cls});
    const c=h.practice.candidates(w)[0]; assert.ok(c,k); assert.ok(c.reviewed); assert.equal(c.unknown.length,0);
  }
});
test('dictionary variants match and unknown words require explicit opt-in',()=>{
  const h=setup(), w=word(h.db,'する','する','verb');
  h.context.window.SENTENCE_BANK=[{id:1,jp:'それをする。',en:'Do that.',pl:'',s:['それ','を','する'],w:['それ','を','為る']}];
  h.context.window.SENTENCE_INDEX={'為る':[0]};
  assert.equal(h.practice.candidates(w).some(c=>c.x.id===1),false);
  const c=h.practice.candidates(w,{onlyKnown:false}).find(c=>c.x.id===1);
  assert.ok(c); assert.deepEqual([...c.unknown],['それ']);
  word(h.db,'それ','それ'); assert.ok(h.practice.candidates(w).some(c=>c.x.id===1));
});
test('misaligned tokens are excluded and form grading accepts reviewed kana variants',()=>{
  const h=setup(), w=word(h.db,'書く','かく','verb');
  h.context.window.SENTENCE_BANK=[{id:1,jp:'書きます。',en:'Write.',s:['書く','ます'],w:['書く','ます']}];
  h.context.window.SENTENCE_INDEX={'書く':[0]};
  assert.equal(h.practice.candidates(w).some(c=>c.x.id===1),false);
  const p={jp:'書きますか。',target:'書きます',surfaces:['書きます','か'],lemmas:['書く','か'],review:'construction-reviewed'};
  assert.ok(h.practice.acceptedAnswers(p,w,2).includes('かきますか'));
  assert.deepEqual([...h.practice.acceptedAnswers({...p,review:''},w,2)],['書きますか。']);
  assert.ok(h.practice.acceptedAnswers(p,w,0).includes('かきます'));
  assert.equal(h.examples.matches('かきます','書きます',h.practice.acceptedAnswers(p,w,0)),true);
  assert.equal(h.examples.matches('書きますか！',p.jp),true);
  assert.equal(h.examples.matches('書きます。',p.jp),false);
});
test('failed bank loads settle all callers and can be retried',async()=>{
  const scripts=[],document={createElement:()=>({remove(){this.removed=true;}}),head:{appendChild:s=>scripts.push(s)}};
  const h=load(['sentence-practice'],{globals:{document}}), p=h.get('SentencePractice');
  const first=p.loadBank(), second=p.loadBank(); assert.equal(scripts.length,1);
  scripts[0].onerror(); assert.equal(await first,false); assert.equal(await second,false);
  const retry=p.loadBank(); assert.equal(scripts.length,2);
  h.context.window.SENTENCE_BANK=[]; h.context.window.SENTENCE_INDEX={}; scripts[1].onload(); assert.equal(await retry,true);
});
