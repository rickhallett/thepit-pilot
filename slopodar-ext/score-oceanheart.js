#!/usr/bin/env node
// score-oceanheart.js — programmatic slopodar scoring of all oceanheart content pages
// Replicates the exact heuristic logic from content.js (slopodar v0.2)
// Output: JSON to stdout

const fs = require('fs');
const path = require('path');

const CONTENT_ROOT = path.join(__dirname, '..', 'sites', 'oceanheart', 'content');

// === Gather all .md files ===
function walkDir(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

// === Strip TOML frontmatter (between +++ delimiters) ===
function parseFrontmatter(raw) {
  const tomlMatch = raw.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+/);
  const yamlMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  
  let fm = {};
  let body = raw;
  
  if (tomlMatch) {
    body = raw.slice(tomlMatch[0].length);
    const fmText = tomlMatch[1];
    // Extract title
    const titleMatch = fmText.match(/title\s*=\s*"([^"]*)"/);
    if (titleMatch) fm.title = titleMatch[1];
    // Extract date
    const dateMatch = fmText.match(/date\s*=\s*"([^"]*)"/);
    if (dateMatch) fm.date = dateMatch[1];
    // Extract draft
    const draftMatch = fmText.match(/draft\s*=\s*(true|false)/);
    if (draftMatch) fm.draft = draftMatch[1] === 'true';
  } else if (yamlMatch) {
    body = raw.slice(yamlMatch[0].length);
    const fmText = yamlMatch[1];
    const titleMatch = fmText.match(/title:\s*"?([^"\n]*)"?/);
    if (titleMatch) fm.title = titleMatch[1].trim();
    const dateMatch = fmText.match(/date:\s*"?([^"\n]*)"?/);
    if (dateMatch) fm.date = dateMatch[1].trim();
  }
  
  return { fm, body };
}

// === Strip markdown to approximate plain text ===
function stripMarkdown(md) {
  let text = md;
  // Remove code blocks (fenced)
  text = text.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');
  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Remove links but keep text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Remove headers markers
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Remove blockquote markers
  text = text.replace(/^>\s*/gm, '');
  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');
  // Remove bold/italic markers
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  text = text.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Collapse multiple whitespace/newlines
  text = text.replace(/\n+/g, ' ');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

// === Slopodar heuristics — exact replication from content.js ===

function scorePage(plainText) {
  const results = {
    totalWords: 0,
    totalSentences: 0,
    emdash: 0,
    absnoun: 0,
    transition: 0,
    epigram: 0,
    anadiplosis: 0,
    isocolon: 0,
    antithesis: 0,
    nomDensity: 0,
    contractions: 0,
    firstPerson: 0,
    questions: 0
  };

  if (!plainText || plainText.length < 10) return results;

  // count total words
  const allWords = plainText.split(/\s+/).filter(w => w.length > 0);
  results.totalWords = allWords.length;

  // split into sentences — same regex as content.js
  const sentences = plainText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  results.totalSentences = sentences.length;

  if (sentences.length < 2) return results;

  // --- nominalisation density (whole text) ---
  const absRe = /\b\w+(?:tion|ment|ness|ity|ence|ance)\b/gi;
  const absMatches = plainText.match(absRe);
  const absCount = absMatches ? absMatches.length : 0;
  results.absnoun = absCount;
  if (results.totalWords > 0) {
    results.nomDensity = parseFloat(((absCount / results.totalWords) * 100).toFixed(1));
  }

  // --- contractions ---
  const contractRe = /\b(don't|won't|can't|it's|I'm|you're|they're|we're|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|didn't|doesn't|I'll|you'll|we'll|they'll|I've|you've|we've|they've|I'd|you'd|we'd|they'd|he's|she's|that's|what's|there's|here's|let's|who's)\b/gi;
  const contractMatches = plainText.match(contractRe);
  results.contractions = contractMatches ? contractMatches.length : 0;

  // --- first-person pronouns ---
  const fpRe = /\b(I|me|my|mine|myself)\b/g;
  const fpMatches = plainText.match(fpRe);
  results.firstPerson = fpMatches ? fpMatches.length : 0;

  // --- questions ---
  let qCount = 0;
  for (let q = 0; q < sentences.length; q++) {
    if (sentences[q].trim().match(/\?$/)) qCount++;
  }
  results.questions = qCount;

  // --- transition words (inline highlighter from content.js) ---
  const transRe = /\b(However|Moreover|Furthermore|Additionally|Consequently|Nevertheless|Nonetheless|Importantly|Specifically|Ultimately|Fundamentally|Indeed|Notably|Interestingly|Crucially|Essentially|Particularly)\b/g;
  const transMatches = plainText.match(transRe);
  results.transition = transMatches ? transMatches.length : 0;

  // --- em-dash count ---
  const emdashMatches = plainText.match(/\u2014/g);
  results.emdash = emdashMatches ? emdashMatches.length : 0;

  // --- per-sentence-pair analysis ---
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const sClean = s.replace(/[.!?]+$/, '').trim();
    const sWords = sClean.split(/\s+/).filter(w => w.length > 0);

    // epigrammatic closure: short sentence (<=6 words) after longer one (>10 words)
    if (i > 0 && sWords.length > 0 && sWords.length <= 6) {
      const prevClean = sentences[i - 1].replace(/[.!?]+$/, '').trim();
      const prevWords = prevClean.split(/\s+/).filter(w => w.length > 0);
      if (prevWords.length > 10) {
        results.epigram++;
      }
    }

    // antithesis: negation contrast patterns
    const antiPatterns = [
      /\bnot\s+\w+[,;]\s*but\b/i,
      /\b\w+[,;]\s*not\s+\w+/i,
      /\brather\s+than\b/i,
      /\binstead\s+of\b/i,
      /\bnothing\s+was\b/i,
      /\bnot\s+through\b.*\bthrough\b/i,
      /\bnot\s+just\b/i
    ];
    for (let ap = 0; ap < antiPatterns.length; ap++) {
      if (antiPatterns[ap].test(s)) { results.antithesis++; break; }
    }

    // pair-based detectors (need next sentence)
    if (i < sentences.length - 1) {
      const nextClean = sentences[i + 1].replace(/[.!?]+$/, '').trim();
      const nextWords = nextClean.split(/\s+/).filter(w => w.length > 0);

      // isocolon: consecutive sentences within ±1 word, both >=5 words
      if (sWords.length >= 5 && nextWords.length >= 5 && Math.abs(sWords.length - nextWords.length) <= 1) {
        results.isocolon++;
      }

      // anadiplosis: last content word of sentence i in first 3 words of sentence i+1
      const tail = sWords.slice(-2).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
      const head = nextWords.slice(0, 3).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
      for (let k = 0; k < tail.length; k++) {
        if (tail[k].length < 4) continue;
        let hFound = false;
        for (let l = 0; l < head.length; l++) {
          if (tail[k] === head[l]) { hFound = true; break; }
        }
        if (hFound) { results.anadiplosis++; break; }
      }
    }
  }

  return results;
}

// === Compute per-1k and percentage rates (same as badge display) ===
function computeRates(r) {
  const per1k = (count) => r.totalWords > 0 ? parseFloat(((count / r.totalWords) * 1000).toFixed(1)) : 0;
  const pctSent = (count) => r.totalSentences > 0 ? parseFloat(((count / r.totalSentences) * 100).toFixed(1)) : 0;

  return {
    contractionPer1k: per1k(r.contractions),
    firstPersonPer1k: per1k(r.firstPerson),
    questionRate: pctSent(r.questions),
    transitionPer1k: per1k(r.transition),
    nomDensity: r.nomDensity,
    emdash: r.emdash,
    absnoun: r.absnoun,
    epigram: r.epigram,
    isocolon: r.isocolon,
    antithesis: r.antithesis,
    anadiplosis: r.anadiplosis
  };
}

// === MAIN ===
const allFiles = walkDir(CONTENT_ROOT);
const results = [];

for (const filePath of allFiles) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { fm, body } = parseFrontmatter(raw);
  const plainText = stripMarkdown(body);
  const scores = scorePage(plainText);
  const rates = computeRates(scores);
  
  // Compute sum score: human_composite - ai_composite
  const humanComposite = rates.contractionPer1k + rates.firstPersonPer1k + rates.questionRate;
  const aiComposite = rates.transitionPer1k + rates.nomDensity;
  const sumScore = parseFloat((humanComposite - aiComposite).toFixed(2));

  const relPath = path.relative(CONTENT_ROOT, filePath);
  const isIndex = path.basename(filePath) === '_index.md';

  results.push({
    filepath: relPath,
    title: fm.title || '(no title)',
    date: fm.date || '(no date)',
    isIndex,
    wordCount: scores.totalWords,
    sentenceCount: scores.totalSentences,
    // Raw counts
    contractions: scores.contractions,
    firstPerson: scores.firstPerson,
    questions: scores.questions,
    transitions: scores.transition,
    emdash: scores.emdash,
    absnoun: scores.absnoun,
    epigram: scores.epigram,
    isocolon: scores.isocolon,
    antithesis: scores.antithesis,
    anadiplosis: scores.anadiplosis,
    // Rates (slopodar display values)
    contractionPer1k: rates.contractionPer1k,
    firstPersonPer1k: rates.firstPersonPer1k,
    questionRate: rates.questionRate,
    transitionPer1k: rates.transitionPer1k,
    nomDensity: rates.nomDensity,
    // Composites
    humanComposite: parseFloat(humanComposite.toFixed(2)),
    aiComposite: parseFloat(aiComposite.toFixed(2)),
    sumScore
  });
}

// Sort by sumScore ascending (worst first)
results.sort((a, b) => a.sumScore - b.sumScore);

// Output JSON
console.log(JSON.stringify(results, null, 2));
