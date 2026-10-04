const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {load,word}=require('./harness.cjs');
function dom() {
  const nodes=new Map(), listeners=new Map();
  const ctx=new Proxy({}, {get:(_o,k)=> k==='setLineDash'||typeof k==='string'?()=>{}:undefined,set:()=>true});
  function node(id) {
    if(nodes.has(id))return nodes.get(id);
    const n={id,hidden:true,disabled:false,tabIndex:0,isConnected:true,inert:false,tagName:'DIV',dataset:{},clientWidth:288,
      classList:{toggle(){},add(){},remove(){}},children:[],innerHTML:'',textContent:'',
      getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:n.clientWidth,height:n.clientWidth}),
      setPointerCapture(){},remove(){},querySelectorAll:()=>n.children,closest:()=>null,
      focus(){document.activeElement=n;},addEventListener(k,fn){(n.handlers[k]??=[]).push(fn);},handlers:{},
      fire(k,e={}){for(const fn of n.handlers[k]||[])fn({target:n,currentTarget:n,...e});}};
    nodes.set(id,n);return n;
  }
  const document={getElementById:node,activeElement:null,body:{children:[]},head:{appendChild(){}},
    createElement:()=>node('script-'+nodes.size),querySelectorAll:()=>[],
    addEventListener(k,f){(listeners.get(k)||listeners.set(k,[]).get(k)).push(f);},
    fire(k,e){for(const f of listeners.get(k)||[])f(e);}};
  return {document,node,listeners};
}
async function drawing(kind,char) {
  const d=dom(), handlers={}, win={devicePixelRatio:1,addEventListener(k,f){handlers[k]=f;}};
  const h=load(['stroke-engine','ui-safety',kind],{window:win,globals:{document:d.document,
    I18N:{t:(k,...a)=>k+' '+a.join(' ')},requestAnimationFrame:f=>f(),getComputedStyle:()=>({getPropertyValue:()=> '#000'})}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,`../www/data/${kind}-data.js`),'utf8'),h.context);
  if(kind==='kanji')word(h.db,char,char);
  h.get(kind==='kanji'?'Kanji':'Kana').bind();h.get(kind==='kanji'?'Kanji':'Kana').render();await Promise.resolve();
  const prefix=kind==='kanji'?'kd':'kn', ink=d.node(prefix+'Ink'),box=d.node(prefix+'CanvasBox');
  const selector=kind==='kanji'?'[data-ch]':'[data-seq]';
  d.node(kind==='kanji'?'kanjiGrid':'knGridGojuon').fire('click',{target:{closest:s=>s===selector?{dataset:kind==='kanji'?{ch:char}:{seq:char}}:null}});
  d.node(prefix+'Test').fire('click');
  const engine=h.get('StrokeEngine');const refs=win[kind==='kanji'?'KANJI_DATA':'KANA_DATA'][char].map(p=>engine.resample(engine.parsePath(p),engine.N));
  const point=(p,id=1)=>({pointerId:id,button:0,isPrimary:id===1,clientX:p.x*box.clientWidth/engine.VBOX,clientY:p.y*box.clientWidth/engine.VBOX});
  const trace=(points,id=1)=>{ink.fire('pointerdown',point(points[0],id));for(const p of points.slice(1))ink.fire('pointermove',point(p,id));ink.fire('pointerup',point(points.at(-1),id));};
  return {...h,...d,win,handlers,refs,trace,point,ink,box,prefix,progress:()=>kind==='kanji'?h.db.kanjiProgress(char):h.db.kanaProgress(char)};
}
test('one 語 attempt earns one pass; extra strokes cannot score until explicit retry',async()=>{
  const h=await drawing('kanji','語'); h.refs.forEach(p=>h.trace(p)); assert.equal(h.progress(),1);
  h.refs.slice(0,3).forEach(p=>h.trace(p)); assert.equal(h.progress(),1);
  h.node('kdRetry').fire('click');h.refs.forEach(p=>h.trace(p));assert.equal(h.progress(),2);
});
test('completed ink survives resizing; interrupted and second-pointer ink is discarded',async()=>{
  const h=await drawing('kanji','水');h.trace(h.refs[0]);
  h.ink.fire('pointerdown',h.point(h.refs[1][0]));h.ink.fire('pointercancel',{pointerId:1});
  h.box.clientWidth=420;h.win.devicePixelRatio=2;h.handlers.resize();
  h.ink.fire('pointerdown',h.point(h.refs[1][0]));h.ink.fire('pointerdown',h.point(h.refs[1][0],2));
  h.ink.fire('pointermove',h.point({x:0,y:0},2));h.ink.fire('pointerup',h.point({x:0,y:0},2));
  for(const p of h.refs[1].slice(1))h.ink.fire('pointermove',h.point(p));h.ink.fire('pointerup',h.point(h.refs[1].at(-1)));
  h.refs.slice(2).forEach(p=>h.trace(p));assert.equal(h.progress(),1);
});
test('kana uses the same stable coordinates and single-result test lock',async()=>{
  const h=await drawing('kana','あ');h.trace(h.refs[0]);h.box.clientWidth=180;h.handlers.resize();
  h.refs.slice(1).forEach(p=>h.trace(p));assert.equal(h.progress(),1);
  h.refs.forEach(p=>h.trace(p));assert.equal(h.progress(),1);
  h.node('knClear').fire('click');h.refs.forEach(p=>h.trace(p));assert.equal(h.progress(),2);
});
test('composition-confirming Enter cannot reach grading; ordinary Enter remains usable',()=>{
  const d=dom(),h=load(['ui-safety'],{globals:{document:d.document}}),s=h.get('InputSafety'),input=d.node('answer');
  s.bind();assert.equal(s.composing({target:input,key:'Enter',isComposing:true}),true);
  assert.equal(s.composing({target:input,key:'Enter',keyCode:229}),true);
  assert.equal(s.composing({target:input,key:'Enter'}),false);
  d.document.fire('compositionstart',{target:input});let stopped=false;
  d.document.fire('keydown',{target:input,key:'Enter',stopImmediatePropagation(){stopped=true;}});assert.equal(stopped,true);
  d.document.fire('compositionend',{target:input});assert.equal(s.composing({target:input,key:'Enter'}),true);
});
test('dialog traps focus, restores it on Escape and makes background inert',()=>{
  const d=dom(),h=load(['ui-safety'],{globals:{document:d.document}}),m=h.get('ModalFocus');
  const modal=d.node('modal'),background=d.node('background'),first=d.node('first'),last=d.node('last');
  modal.children=[first,last];d.document.body.children=[background,modal];d.document.querySelectorAll=()=>[modal];
  background.focus();m.bind();m.open(modal);assert.equal(d.document.activeElement,first);assert.equal(background.inert,true);
  last.focus();d.document.fire('keydown',{target:last,key:'Tab',preventDefault(){}});assert.equal(d.document.activeElement,first);
  d.document.fire('keydown',{target:first,key:'Escape',preventDefault(){}});assert.equal(modal.hidden,true);assert.equal(background.inert,false);assert.equal(d.document.activeElement,background);
});
test('concurrent dataset requests settle together, reject missing globals, and retry failures',async()=>{
  const scripts=[],document={createElement:()=>({remove(){}}),head:{appendChild:s=>scripts.push(s)}};
  const h=load(['ui-safety'],{globals:{document}}),loader=h.get('DatasetLoader');let ready=false;
  const a=loader.load('strokes.js',()=>ready),b=loader.load('strokes.js',()=>ready);assert.equal(scripts.length,1);
  scripts[0].onload();assert.equal(await a,false);assert.equal(await b,false);
  const c=loader.load('strokes.js',()=>ready);assert.equal(scripts.length,2);ready=true;scripts[1].onload();assert.equal(await c,true);
});
