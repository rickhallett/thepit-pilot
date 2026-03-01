#!/usr/bin/env node
// slopodar calibration script
// usage: node calibrate.js
// fetches a spread of pages, runs detectors on extracted text, outputs TSV

const urls = [
  // === PRE-LLM HUMAN (ground truth: cannot be LLM) ===
  { url: 'https://paulgraham.com/greatwork.html', cat: 'pre-llm', label: 'PG - How to Do Great Work (2023 but handwritten)' },
  { url: 'https://paulgraham.com/hp.html', cat: 'pre-llm', label: 'PG - Hackers and Painters (2003)' },
  { url: 'https://paulgraham.com/avg.html', cat: 'pre-llm', label: 'PG - Beating the Averages (2001)' },
  { url: 'https://paulgraham.com/nerds.html', cat: 'pre-llm', label: 'PG - Why Nerds are Unpopular (2003)' },
  { url: 'https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/', cat: 'pre-llm', label: 'Spolsky - Never Rewrite (2000)' },
  { url: 'https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/', cat: 'pre-llm', label: 'Spolsky - Leaky Abstractions (2002)' },
  { url: 'https://www.gwern.net/Scaling-hypothesis', cat: 'pre-llm', label: 'Gwern - Scaling Hypothesis (2020)' },
  { url: 'https://blog.codinghorror.com/the-best-code-is-no-code-at-all/', cat: 'pre-llm', label: 'Atwood - No Code (2007)' },
  { url: 'https://www.kalzumeus.com/2011/10/28/dont-call-yourself-a-programmer/', cat: 'pre-llm', label: 'patio11 - Dont Call Yourself a Programmer (2011)' },

  // === POST-LLM KNOWN HUMAN ===
  { url: 'https://danluu.com/cocktail-ideas/', cat: 'post-human', label: 'Dan Luu - Cocktail Ideas' },
  { url: 'https://rachelbythebay.com/w/', cat: 'post-human', label: 'Rachel by the Bay - latest' },
  { url: 'https://250bpm.com/', cat: 'post-human', label: 'Martin Sustrik - latest' },

  // === AI COMPANY BLOGS ===
  { url: 'https://www.anthropic.com/research/building-effective-agents', cat: 'ai-co', label: 'Anthropic - Building Effective Agents' },
  { url: 'https://www.anthropic.com/engineering/swe-bench-sonnet', cat: 'ai-co', label: 'Anthropic - SWE Bench' },
  { url: 'https://openai.com/index/openai-o3-mini/', cat: 'ai-co', label: 'OpenAI - o3 mini' },

  // === SIMON WILLISON (interesting signal) ===
  { url: 'https://simonwillison.net/2024/Dec/19/gemini-2-flash-thinking/', cat: 'willison', label: 'Willison - Gemini 2 Flash Thinking' },
  { url: 'https://simonwillison.net/2024/Oct/17/not-magic/', cat: 'willison', label: 'Willison - Not Magic' },
  { url: 'https://simonwillison.net/2023/Mar/10/chatgpt-internet-access/', cat: 'willison', label: 'Willison - ChatGPT Internet Access (2023)' },
];

// === DETECTORS (same logic as content.js) ===

function analyze(text) {
  const results = { emdash: 0, absnoun: 0, totalWords: 0, epigram: 0, anadiplosis: 0, isocolon: 0, antithesis: 0, nomDensity: 0 };

  const words = text.split(/\s+/).filter(w => w.length > 0);
  results.totalWords = words.length;
  if (results.totalWords < 20) return results;

  // em-dashes
  results.emdash = (text.match(/\u2014/g) || []).length;

  // abstract nouns
  const absRe = /\b\w+(?:tion|ment|ness|ity|ence|ance)\b/gi;
  const absMatches = text.match(absRe);
  results.absnoun = absMatches ? absMatches.length : 0;
  results.nomDensity = ((results.absnoun / results.totalWords) * 100).toFixed(1);

  // sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return results;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const sClean = s.replace(/[.!?]+$/, '').trim();
    const sWords = sClean.split(/\s+/).filter(w => w.length > 0);

    // epigrammatic closure
    if (i > 0 && sWords.length > 0 && sWords.length <= 6) {
      const prevClean = sentences[i - 1].replace(/[.!?]+$/, '').trim();
      const prevWords = prevClean.split(/\s+/).filter(w => w.length > 0);
      if (prevWords.length > 10) results.epigram++;
    }

    // antithesis
    const antiPatterns = [
      /\bnot\s+\w+[,;]\s*but\b/i, /\b\w+[,;]\s*not\s+\w+/i,
      /\brather\s+than\b/i, /\binstead\s+of\b/i, /\bnothing\s+was\b/i,
      /\bnot\s+through\b.*\bthrough\b/i, /\bnot\s+just\b/i
    ];
    for (const p of antiPatterns) {
      if (p.test(s)) { results.antithesis++; break; }
    }

    // pair-based
    if (i < sentences.length - 1) {
      const nextClean = sentences[i + 1].replace(/[.!?]+$/, '').trim();
      const nextWords = nextClean.split(/\s+/).filter(w => w.length > 0);

      // isocolon
      if (sWords.length >= 5 && nextWords.length >= 5 && Math.abs(sWords.length - nextWords.length) <= 1) {
        results.isocolon++;
      }

      // anadiplosis
      const tail = sWords.slice(-2).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
      const head = nextWords.slice(0, 3).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
      for (const tw of tail) {
        if (tw.length < 4) continue;
        if (head.includes(tw)) { results.anadiplosis++; break; }
      }
    }
  }

  return results;
}

// === FETCH AND ANALYZE ===

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'slopodar-calibration/0.1 (research)' },
      signal: AbortSignal.timeout(15000)
    });
    const html = await res.text();
    // crude HTML → text: strip tags, decode entities
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    console.error('FAIL: ' + url + ' — ' + e.message);
    return '';
  }
}

async function main() {
  // TSV header
  console.log(['cat', 'label', 'words', 'emdash', 'absnoun', 'nom%', 'epigram', 'isocolon', 'antithesis', 'anadiplosis', 'signals', 'per1k', 'composite'].join('\t'));

  for (const entry of urls) {
    const text = await fetchText(entry.url);
    if (!text) continue;
    const r = analyze(text);
    const totalSignals = r.emdash + r.epigram + r.anadiplosis + r.isocolon + r.antithesis;
    const per1k = r.totalWords > 0 ? ((totalSignals / r.totalWords) * 1000).toFixed(1) : '0';
    const nomD = parseFloat(r.nomDensity) || 0;
    const composite = (parseFloat(per1k) + (nomD > 2 ? (nomD - 2) * 3 : 0)).toFixed(1);

    console.log([
      entry.cat, entry.label, r.totalWords, r.emdash, r.absnoun, r.nomDensity,
      r.epigram, r.isocolon, r.antithesis, r.anadiplosis,
      totalSignals, per1k, composite
    ].join('\t'));
  }
}

main();
