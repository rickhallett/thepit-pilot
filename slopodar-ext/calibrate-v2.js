#!/usr/bin/env node
// slopodar calibration v2 — expanded features + expanded dataset
// outputs TSV to stdout, pipe to file

const urls = [
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
  { url: 'https://jvns.ca/blog/2023/04/04/what-are-monoidal-categories/', cat: 'B-human-post', label: 'JuliaEvans-Monoids-2023' },
  { url: 'https://jvns.ca/blog/2024/01/01/some-terminal-frustrations/', cat: 'B-human-post', label: 'JuliaEvans-TerminalFrustrations-2024' },
  { url: 'https://drewdevault.com/2024/01/18/2024-01-18-Rust-is-not-a-good-C-replacement.html', cat: 'B-human-post', label: 'DrewDeVault-RustNotC-2024' },
  { url: 'https://drewdevault.com/2022/05/12/Supply-chain-when-will-we-learn.html', cat: 'B-human-post', label: 'DrewDeVault-SupplyChain-2022' },
  { url: 'https://www.hillelwayne.com/post/crossover-project/are-we-really-engineers/', cat: 'B-human-post', label: 'HillelWayne-ReallyEngineers' },

  // === C: AI COMPANY BLOGS ===
  { url: 'https://www.anthropic.com/research/building-effective-agents', cat: 'C-ai-co', label: 'Anthropic-EffectiveAgents' },
  { url: 'https://www.anthropic.com/engineering/swe-bench-sonnet', cat: 'C-ai-co', label: 'Anthropic-SWEBench' },
  { url: 'https://www.anthropic.com/research/claude-character', cat: 'C-ai-co', label: 'Anthropic-ClaudeCharacter' },
  { url: 'https://www.anthropic.com/research/measuring-model-persuasion', cat: 'C-ai-co', label: 'Anthropic-Persuasion' },
  { url: 'https://openai.com/index/learning-to-reason-with-llms/', cat: 'C-ai-co', label: 'OpenAI-ReasonLLMs' },
  { url: 'https://openai.com/index/dall-e-3/', cat: 'C-ai-co', label: 'OpenAI-DallE3' },
  { url: 'https://deepmind.google/discover/blog/gemini-2-0-our-new-ai-model-for-the-agentic-era/', cat: 'C-ai-co', label: 'DeepMind-Gemini2' },
  { url: 'https://deepmind.google/discover/blog/alphafold-3-predicts-the-structure-and-interactions-of-all-of-lifes-molecules/', cat: 'C-ai-co', label: 'DeepMind-AlphaFold3' },

  // === D: SUSPECTED LLM-HEAVY ===
  // (Medium AI articles, LinkedIn-style)
  { url: 'https://medium.com/@kozyrkov/what-is-ai-really-b8c8a0a30a8a', cat: 'D-suspected', label: 'Medium-WhatIsAI-Kozyrkov' },
  { url: 'https://medium.com/towards-data-science/the-ai-revolution-is-here-5-things-you-need-to-know-about-gpt-4-f9a0a2a1b7e1', cat: 'D-suspected', label: 'Medium-AIRevolution-TDS' },

  // === E: WILLISON LONGITUDINAL ===
  { url: 'https://simonwillison.net/2020/Oct/9/git-scraping/', cat: 'E-willison', label: 'Willison-GitScraping-2020' },
  { url: 'https://simonwillison.net/2022/Jun/12/llm-hierarchies/', cat: 'E-willison', label: 'Willison-LLMHierarchies-2022' },
  { url: 'https://simonwillison.net/2023/Mar/10/chatgpt-internet-access/', cat: 'E-willison', label: 'Willison-ChatGPTAccess-2023' },
  { url: 'https://simonwillison.net/2024/Dec/19/gemini-2-flash-thinking/', cat: 'E-willison', label: 'Willison-Gemini2Flash-2024' },
];

// === ANALYSIS ===

function analyze(text) {
  const r = {};

  const allWords = text.split(/\s+/).filter(w => w.length > 0);
  r.totalWords = allWords.length;
  if (r.totalWords < 30) return null; // skip too-short extractions

  // sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  r.totalSentences = sentences.length;
  if (r.totalSentences < 3) return null;

  const sentLengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);

  // F9: avg sentence length
  r.avgSentLen = (sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length).toFixed(1);

  // F1: sentence length std dev
  const mean = sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length;
  const variance = sentLengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sentLengths.length;
  r.sentLenStdDev = Math.sqrt(variance).toFixed(1);

  // F10: short sentence ratio (≤5 words)
  r.shortSentRatio = ((sentLengths.filter(l => l <= 5).length / sentLengths.length) * 100).toFixed(1);

  // F11: long sentence ratio (≥30 words)
  r.longSentRatio = ((sentLengths.filter(l => l >= 30).length / sentLengths.length) * 100).toFixed(1);

  // original 7 detectors
  r.emdash = (text.match(/\u2014/g) || []).length;
  r.emdashPer1k = ((r.emdash / r.totalWords) * 1000).toFixed(1);

  const absRe = /\b\w+(?:tion|ment|ness|ity|ence|ance)\b/gi;
  const absMatches = text.match(absRe);
  r.absnoun = absMatches ? absMatches.length : 0;
  r.nomDensity = ((r.absnoun / r.totalWords) * 100).toFixed(2);

  // structural detectors on sentence stream
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

  // normalize structural per 1k words
  r.epigramPer1k = ((r.epigram / r.totalWords) * 1000).toFixed(1);
  r.isocolonPer1k = ((r.isocolon / r.totalWords) * 1000).toFixed(1);
  r.antithesisPer1k = ((r.antithesis / r.totalWords) * 1000).toFixed(1);
  r.anadipPer1k = ((r.anadiplosis / r.totalWords) * 1000).toFixed(1);

  // === NEW FEATURES ===

  // F2: contraction rate
  const contractions = text.match(/\b(don't|won't|can't|it's|I'm|you're|they're|we're|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|didn't|doesn't|I'll|you'll|we'll|they'll|I've|you've|we've|they've|I'd|you'd|we'd|they'd|he's|she's|that's|what's|there's|here's|let's|who's)\b/gi);
  r.contractionPer1k = ((contractions ? contractions.length : 0) / r.totalWords * 1000).toFixed(1);

  // F3: first-person rate
  const firstPerson = text.match(/\b(I|me|my|mine|myself)\b/g);
  r.firstPersonPer1k = ((firstPerson ? firstPerson.length : 0) / r.totalWords * 1000).toFixed(1);

  // F4: question rate
  const questions = sentences.filter(s => s.trim().endsWith('?'));
  r.questionRate = ((questions.length / sentences.length) * 100).toFixed(1);

  // F5: transition word density (formal, sentence-start type)
  const transitions = text.match(/\b(However|Moreover|Furthermore|Additionally|Consequently|Nevertheless|Nonetheless|Importantly|Specifically|Ultimately|Fundamentally|Indeed|Notably|Interestingly|Crucially|Essentially|Particularly)\b/g);
  r.transitionPer1k = ((transitions ? transitions.length : 0) / r.totalWords * 1000).toFixed(1);

  // F6: hedge word density
  const hedges = text.match(/\b(perhaps|maybe|somewhat|fairly|quite|rather|slightly|arguably|potentially|essentially|generally|typically|largely|primarily|relatively)\b/gi);
  r.hedgePer1k = ((hedges ? hedges.length : 0) / r.totalWords * 1000).toFixed(1);

  // F7: parenthetical rate
  const parens = text.match(/\([^)]+\)/g);
  r.parenPer1k = ((parens ? parens.length : 0) / r.totalWords * 1000).toFixed(1);

  // F8: exclamation rate
  const exclamations = sentences.filter(s => s.trim().endsWith('!'));
  r.exclamationRate = ((exclamations.length / sentences.length) * 100).toFixed(1);

  // F12: semicolon rate
  const semicolons = text.match(/;/g);
  r.semicolonPer1k = ((semicolons ? semicolons.length : 0) / r.totalWords * 1000).toFixed(1);

  // F13: colon rate
  const colons = text.match(/(?<!\/):/g); // avoid URLs
  r.colonPer1k = ((colons ? colons.length : 0) / r.totalWords * 1000).toFixed(1);

  return r;
}

// === FETCH ===

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'slopodar-calibration/0.2 (research, github.com/rickhallett/thepit)' },
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
    console.error('FAIL: ' + url + ' — ' + e.message);
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

async function main() {
  console.log(FIELDS.join('\t'));

  for (const entry of urls) {
    const text = await fetchText(entry.url);
    if (!text) { console.error('SKIP (empty): ' + entry.label); continue; }
    const r = analyze(text);
    if (!r) { console.error('SKIP (too short): ' + entry.label + ' (' + text.split(/\s+/).length + ' words)'); continue; }

    const row = FIELDS.map(f => {
      if (f === 'cat') return entry.cat;
      if (f === 'label') return entry.label;
      return r[f] !== undefined ? r[f] : '';
    });
    console.log(row.join('\t'));
  }
}

main();
