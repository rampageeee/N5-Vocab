#!/usr/bin/env node
// Read-only data audit: does not generate or change the bank.
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const ctx = vm.createContext({window:{}}), root = path.join(__dirname, '..');
vm.runInContext(fs.readFileSync(path.join(root, 'js/sentence-examples.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/sentence-bank.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/beginner-sentences.js'), 'utf8'), ctx);
const bank = ctx.window.SENTENCE_BANK, starter = ctx.window.BEGINNER_SENTENCES;
const aligned = vm.runInContext('SentenceExamples.aligned', ctx);
const report = {sentences:bank.length, rawSurfaceMismatch:bank.filter(x=>x.jp.replace(/[\s。、！？!?.,「」『』]/g,'')!==x.s.join('')).length,
 excludedByTokenValidation:bank.filter(x=>!aligned(x)).length,
 missingPolish:bank.filter(x=>!x.pl).length, starterExamples:starter.length,
 invalidStarterExamples:starter.filter(x=>!aligned(x)||!x.en||!x.pl||!x.source).length};
console.log(JSON.stringify(report, null, 2));
if (report.invalidStarterExamples) process.exitCode=1;
