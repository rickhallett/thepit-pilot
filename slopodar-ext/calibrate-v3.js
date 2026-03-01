#!/usr/bin/env node
// slopodar calibration v3 — adds Category D alternatives + Category F (Captain)
// outputs TSV to stdout, pipe to file
// usage: node calibrate-v3.js > calibration-data-v3.tsv 2> calibrate-v3-errors.log

const fs = require('fs');
const path = require('path');

// === REMOTE URLs ===
const remoteEntries = [
  // === A: PRE-LLM HUMAN (ground truth) ===
  { url: 'https://paulgraham.com/greatwork.html', cat: 'A-human-pre', label: 'PG-GreatWork-2023' },
  { url: 'https://paulgraham.com/hp.html', cat: 'A-human-pre', label: 'PG-HackersPainters-2003' },
  { url: 'https://paulgraham.com/avg.html', cat: 'A-human-pre', label: 'PG-BeatingAverages-2001' },
  { url: 'https://paulgraham.com/nerds.html', cat: 'A-human-pre', label: 'PG-WhyNerds-2003' },
  { url: 'https://paulgraham.com/ds.html', cat: 'A-human-pre', label: 'PG-DoThingsDontScale-2013' },
  { url: 'https://paulgraham.com/startupideas.html', cat: 'A-human-pre', label: 'PG-StartupIdeas-2012' },
  { url: 'https://paulgraham.com/schlep.html', cat: 'A-human-pre', label: 'PG-SchlepBlindness-2012' },
  { url: 'https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/', cat: 'A-human-pre', label: 'Spolsky-NeverRewrite-2000' },
  { url: 'https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/', cat: 'A-human-pre', label: 'Spolsky-LeakyAbstractions-2002' },
  { url: 'https://www.joelonsoftware.com/2005/12/29/the-perils-of-javaschools-2/', cat: 'A-human-pre', label: 'Spolsky-JavaSchools-2005' },
  { url: 'https://blog.codinghorror.com/the-best-code-is-no-code-at-all/', cat: 'A-human-pre', label: 'Atwood-NoCode-2007' },
  { url: 'https://blog.codinghorror.com/code-smells/', cat: 'A-human-pre', label: 'Atwood-CodeSmells-2006' },
  { url: 'https://blog.codinghorror.com/the-magpie-developer/', cat: 'A-human-pre', label: 'Atwood-MagpieDev-2008' },
  { url: 'https://www.kalzumeus.com/2011/10/28/dont-call-yourself-a-programmer/', cat: 'A-human-pre', label: 'patio11-DontCallYourself-2011' },
  { url: 'https://www.kalzumeus.com/2012/01/23/salary-negotiation/', cat: 'A-human-pre', label: 'patio11-SalaryNeg-2012' },
  { url: 'https://www.gwern.net/Scaling-hypothesis', cat: 'A-human-pre', label: 'Gwern-ScalingHypothesis-2020' },
  { url: 'https://steve-yegge.blogspot.com/2006/03/execution-in-kingdom-of-nouns.html', cat: 'A-human-pre', label: 'Yegge-KingdomNouns-2006' },
  { url: 'https://idlewords.com/talks/web_design_first_100_years.htm', cat: 'A-human-pre', label: 'Ceglowski-WebDesign100-2014' },
  { url: 'http://www.aaronsw.com/weblog/productivity', cat: 'A-human-pre', label: 'Swartz-Productivity-2005' },

  // === B: POST-LLM KNOWN HUMAN ===
  { url: 'https://danluu.com/cocktail-ideas/', cat: 'B-human-post', label: 'DanLuu-CocktailIdeas' },
  { url: 'https://danluu.com/sounds-easy/', cat: 'B-human-post', label: 'DanLuu-SoundsEasy' },
  { url: 'https://danluu.com/programmer-moneyball/', cat: 'B-human-post', label: 'DanLuu-Moneyball' },
  { url: 'https://drewdevault.com/2022/05/12/Supply-chain-when-will-we-learn.html', cat: 'B-human-post', label: 'DrewDeVault-SupplyChain-2022' },

  // === C: AI COMPANY BLOGS (expanded — static HTML alternatives) ===
  { url: 'https://www.anthropic.com/research/building-effective-agents', cat: 'C-ai-co', label: 'Anthropic-EffectiveAgents' },
  { url: 'https://www.anthropic.com/engineering/swe-bench-sonnet', cat: 'C-ai-co', label: 'Anthropic-SWEBench' },
  { url: 'https://www.anthropic.com/research/claude-character', cat: 'C-ai-co', label: 'Anthropic-ClaudeCharacter' },
  // Try additional Anthropic pages
  { url: 'https://www.anthropic.com/research/mapping-mind-language-model', cat: 'C-ai-co', label: 'Anthropic-MappingMind' },
  { url: 'https://www.anthropic.com/research/probes-catch-sleeper-agents', cat: 'C-ai-co', label: 'Anthropic-SleeperAgents' },
  // Cohere blog (static HTML)
  { url: 'https://cohere.com/blog/rerank-3pt5', cat: 'C-ai-co', label: 'Cohere-Rerank3.5' },
  { url: 'https://cohere.com/blog/command-r7b', cat: 'C-ai-co', label: 'Cohere-CommandR7B' },
  // Mistral (static)
  { url: 'https://mistral.ai/news/codestral-2501/', cat: 'C-ai-co', label: 'Mistral-Codestral' },
  { url: 'https://mistral.ai/news/mistral-large-2407/', cat: 'C-ai-co', label: 'Mistral-Large2' },

  // === D: SUSPECTED LLM-HEAVY (alternative static-HTML sources) ===
  // Substack AI newsletters (static HTML, likely AI-assisted)
  { url: 'https://www.oneusefulthing.org/p/what-just-happened-with-ai-is-the', cat: 'D-suspected', label: 'Mollick-WhatJustHappened' },
  { url: 'https://www.oneusefulthing.org/p/signs-and-portents', cat: 'D-suspected', label: 'Mollick-SignsPortents' },
  // The Algorithmic Bridge (Substack)
  { url: 'https://thealgorithmicbridge.substack.com/p/openais-o1-is-a-new-paradigm-for', cat: 'D-suspected', label: 'AlgoBridge-O1Paradigm' },
  // Import AI (static newsletter)
  { url: 'https://importai.substack.com/p/import-ai-388-openais-o3-agents-in', cat: 'D-suspected', label: 'ImportAI-388' },
  // AI-focused Substack with high LLM co-writing probability
  { url: 'https://www.latent.space/p/2024-papers', cat: 'D-suspected', label: 'LatentSpace-2024Papers' },
  { url: 'https://www.latent.space/p/agents', cat: 'D-suspected', label: 'LatentSpace-Agents' },

  // === E: WILLISON LONGITUDINAL ===
  { url: 'https://simonwillison.net/2020/Oct/9/git-scraping/', cat: 'E-willison', label: 'Willison-GitScraping-2020' },
  { url: 'https://simonwillison.net/2023/Mar/10/chatgpt-internet-access/', cat: 'E-willison', label: 'Willison-ChatGPTAccess-2023' },
  // Longer Willison posts
  { url: 'https://simonwillison.net/2024/Mar/8/gpt-4-barrier/', cat: 'E-willison', label: 'Willison-GPT4Barrier-2024' },
  { url: 'https://simonwillison.net/2023/Aug/3/weird-world-of-llms/', cat: 'E-willison', label: 'Willison-WeirdWorld-2023' },
];

// === LOCAL FILES (Category F: Captain) ===
const localEntries = [
  // Captain's verbatim writing — canonical source is docs/internal/.
  // These are blockquoted sections extracted for calibration.
  // To re-run: extract > blockquotes from the source files below.
  // Source: docs/internal/captain/captainslog/2026/02/23-the-still-point.md (lines 11-39)
  // Source: docs/internal/main-thread/2026-02-25-003-dismissed.md (lines 10-28)
  // Source: docs/internal/archive/main-thread/2026-02-25-001-the-honest-layer.md (both passes)
  // Source: docs/internal/archive/main-thread/2026-02-24-001-weave-calibration.md (lines 12-36)
  // Source: docs/internal/archive/main-thread/2026-02-25-002-going-light.md (lines 10-20)
  // Source: docs/internal/captain/captainslog/2026/02/23-fair-winds.md (blockquotes)
  // v3 calibration data for Category F was generated from local copies (now removed per SD-251).
  // The calibration-data-v3.tsv preserves the computed features.
];

// === ANALYSIS (same as v2) ===

function analyze(text) {
  const r = {};

  const allWords = text.split(/\s+/).filter(w => w.length > 0);
  r.totalWords = allWords.length;
  if (r.totalWords < 30) return null;

  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  r.totalSentences = sentences.length;
  if (r.totalSentences < 3) return null;

  const sentLengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);

  r.avgSentLen = (sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length).toFixed(1);

  const mean = sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length;
  const variance = sentLengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sentLengths.length;
  r.sentLenStdDev = Math.sqrt(variance).toFixed(1);

  r.shortSentRatio = ((sentLengths.filter(l => l <= 5).length / sentLengths.length) * 100).toFixed(1);
  r.longSentRatio = ((sentLengths.filter(l => l >= 30).length / sentLengths.length) * 100).toFixed(1);

  r.emdash = (text.match(/\u2014/g) || []).length;
  r.emdashPer1k = ((r.emdash / r.totalWords) * 1000).toFixed(1);

  const absRe = /\b\w+(?:tion|ment|ness|ity|ence|ance)\b/gi;
  const absMatches = text.match(absRe);
  r.absnoun = absMatches ? absMatches.length : 0;
  r.nomDensity = ((r.absnoun / r.totalWords) * 100).toFixed(2);

  r.epigram = 0; r.isocolon = 0; r.antithesis = 0; r.anadiplosis = 0;

  const antiPatterns = [
    /\bnot\s+\w+[,;]\s*but\b/i, /\b\w+[,;]\s*not\s+\w+/i,
    /\brather\s+than\b/i, /\binstead\s+of\b/i, /\bnothing\s+was\b/i,
    /\bnot\s+through\b.*\bthrough\b/i, /\bnot\s+just\b/i
  ];

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const sClean = s.replace(/[.!?]+$/, '').trim();
    const sWords = sClean.split(/\s+/).filter(w => w.length > 0);

    if (i > 0 && sWords.length > 0 && sWords.length <= 6) {
      const prevClean = sentences[i - 1].replace(/[.!?]+$/, '').trim();
      const prevWords = prevClean.split(/\s+/).filter(w => w.length > 0);
      if (prevWords.length > 10) r.epigram++;
    }

    for (const p of antiPatterns) {
      if (p.test(s)) { r.antithesis++; break; }
    }

    if (i < sentences.length - 1) {
      const nextClean = sentences[i + 1].replace(/[.!?]+$/, '').trim();
      const nextWords = nextClean.split(/\s+/).filter(w => w.length > 0);

      if (sWords.length >= 5 && nextWords.length >= 5 && Math.abs(sWords.length - nextWords.length) <= 1) {
        r.isocolon++;
      }

      const tail = sWords.slice(-2).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
      const head = nextWords.slice(0, 3).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
      for (const tw of tail) {
        if (tw.length < 4) continue;
        if (head.includes(tw)) { r.anadiplosis++; break; }
      }
    }
  }

  r.epigramPer1k = ((r.epigram / r.totalWords) * 1000).toFixed(1);
  r.isocolonPer1k = ((r.isocolon / r.totalWords) * 1000).toFixed(1);
  r.antithesisPer1k = ((r.antithesis / r.totalWords) * 1000).toFixed(1);
  r.anadipPer1k = ((r.anadiplosis / r.totalWords) * 1000).toFixed(1);

  // voice markers
  const contractions = text.match(/\b(don't|won't|can't|it's|I'm|you're|they're|we're|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|didn't|doesn't|I'll|you'll|we'll|they'll|I've|you've|we've|they've|I'd|you'd|we'd|they'd|he's|she's|that's|what's|there's|here's|let's|who's)\b/gi);
  r.contractionPer1k = ((contractions ? contractions.length : 0) / r.totalWords * 1000).toFixed(1);

  const firstPerson = text.match(/\b(I|me|my|mine|myself)\b/g);
  r.firstPersonPer1k = ((firstPerson ? firstPerson.length : 0) / r.totalWords * 1000).toFixed(1);

  const questions = sentences.filter(s => s.trim().endsWith('?'));
  r.questionRate = ((questions.length / sentences.length) * 100).toFixed(1);

  const transitions = text.match(/\b(However|Moreover|Furthermore|Additionally|Consequently|Nevertheless|Nonetheless|Importantly|Specifically|Ultimately|Fundamentally|Indeed|Notably|Interestingly|Crucially|Essentially|Particularly)\b/g);
  r.transitionPer1k = ((transitions ? transitions.length : 0) / r.totalWords * 1000).toFixed(1);

  const hedges = text.match(/\b(perhaps|maybe|somewhat|fairly|quite|rather|slightly|arguably|potentially|essentially|generally|typically|largely|primarily|relatively)\b/gi);
  r.hedgePer1k = ((hedges ? hedges.length : 0) / r.totalWords * 1000).toFixed(1);

  const parens = text.match(/\([^)]+\)/g);
  r.parenPer1k = ((parens ? parens.length : 0) / r.totalWords * 1000).toFixed(1);

  const exclamations = sentences.filter(s => s.trim().endsWith('!'));
  r.exclamationRate = ((exclamations.length / sentences.length) * 100).toFixed(1);

  const semicolons = text.match(/;/g);
  r.semicolonPer1k = ((semicolons ? semicolons.length : 0) / r.totalWords * 1000).toFixed(1);

  const colons = text.match(/(?<!\/):/g);
  r.colonPer1k = ((colons ? colons.length : 0) / r.totalWords * 1000).toFixed(1);

  return r;
}

// === FETCH ===

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'slopodar-calibration/0.3 (research, github.com/rickhallett/thepit)' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow'
    });
    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    console.error('FAIL: ' + url + ' \u2014 ' + e.message);
    return '';
  }
}

// === MAIN ===

const FIELDS = [
  'cat', 'label', 'totalWords', 'totalSentences', 'avgSentLen', 'sentLenStdDev',
  'shortSentRatio', 'longSentRatio',
  'emdash', 'emdashPer1k', 'absnoun', 'nomDensity',
  'epigram', 'epigramPer1k', 'isocolon', 'isocolonPer1k',
  'antithesis', 'antithesisPer1k', 'anadiplosis', 'anadipPer1k',
  'contractionPer1k', 'firstPersonPer1k', 'questionRate',
  'transitionPer1k', 'hedgePer1k', 'parenPer1k',
  'exclamationRate', 'semicolonPer1k', 'colonPer1k'
];

function outputRow(cat, label, r) {
  const row = FIELDS.map(f => {
    if (f === 'cat') return cat;
    if (f === 'label') return label;
    return r[f] !== undefined ? r[f] : '';
  });
  console.log(row.join('\t'));
}

async function main() {
  console.log(FIELDS.join('\t'));

  // process remote URLs
  for (const entry of remoteEntries) {
    const text = await fetchText(entry.url);
    if (!text) { console.error('SKIP (empty): ' + entry.label); continue; }
    const r = analyze(text);
    if (!r) { console.error('SKIP (too short): ' + entry.label + ' (' + text.split(/\s+/).length + ' words)'); continue; }
    outputRow(entry.cat, entry.label, r);
  }

  // process local files (Captain)
  for (const entry of localEntries) {
    const filePath = path.join(__dirname, entry.file);
    try {
      const text = fs.readFileSync(filePath, 'utf8').trim();
      if (!text) { console.error('SKIP (empty): ' + entry.label); continue; }
      const r = analyze(text);
      if (!r) { console.error('SKIP (too short): ' + entry.label + ' (' + text.split(/\s+/).length + ' words)'); continue; }
      outputRow(entry.cat, entry.label, r);
    } catch (e) {
      console.error('FAIL (local): ' + entry.label + ' \u2014 ' + e.message);
    }
  }
}

main();
