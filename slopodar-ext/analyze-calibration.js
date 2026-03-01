#!/usr/bin/env node
// slopodar calibration analysis — compute per-category statistics and effect sizes
// reads calibration-data.tsv, outputs analysis to stdout

const fs = require('fs');
const path = require('path');

const tsvFile = process.argv[2] || 'calibration-data-v3.tsv';
const tsv = fs.readFileSync(path.join(__dirname, tsvFile), 'utf8');
const lines = tsv.trim().split('\n');
const headers = lines[0].split('\t');
const rows = lines.slice(1).map(line => {
  const vals = line.split('\t');
  const obj = {};
  headers.forEach((h, i) => { obj[h] = vals[i]; });
  return obj;
});

// numeric features to analyze
const FEATURES = [
  'totalWords', 'totalSentences', 'avgSentLen', 'sentLenStdDev',
  'shortSentRatio', 'longSentRatio',
  'emdashPer1k', 'nomDensity',
  'epigramPer1k', 'isocolonPer1k', 'antithesisPer1k', 'anadipPer1k',
  'contractionPer1k', 'firstPersonPer1k', 'questionRate',
  'transitionPer1k', 'hedgePer1k', 'parenPer1k',
  'exclamationRate', 'semicolonPer1k', 'colonPer1k'
];

// group by category
const cats = {};
for (const row of rows) {
  const cat = row.cat;
  if (!cats[cat]) cats[cat] = [];
  cats[cat].push(row);
}

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length);
}
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Cohen's d: (mean1 - mean2) / pooled_sd
function cohensD(arr1, arr2) {
  const m1 = mean(arr1), m2 = mean(arr2);
  const s1 = stddev(arr1), s2 = stddev(arr2);
  const n1 = arr1.length, n2 = arr2.length;
  const pooled = Math.sqrt(((n1 * s1 * s1) + (n2 * s2 * s2)) / (n1 + n2));
  if (pooled === 0) return 0;
  return (m1 - m2) / pooled;
}

// extract feature values for a category, filtering out tiny samples
function getVals(cat, feature) {
  return (cats[cat] || [])
    .map(r => parseFloat(r[feature]))
    .filter(v => !isNaN(v));
}

console.log('='.repeat(80));
console.log('SLOPODAR CALIBRATION v2 — STATISTICAL ANALYSIS');
console.log('='.repeat(80));
console.log(`\nDataset: ${rows.length} pages across ${Object.keys(cats).length} categories`);
console.log('Categories:');
for (const [cat, entries] of Object.entries(cats)) {
  console.log(`  ${cat}: ${entries.length} pages (${entries.map(e => e.label).join(', ')})`);
}

// === PER-CATEGORY STATISTICS ===
console.log('\n' + '='.repeat(80));
console.log('PER-CATEGORY STATISTICS (mean ± σ | median)');
console.log('='.repeat(80));

for (const feat of FEATURES) {
  console.log(`\n--- ${feat} ---`);
  const table = [];
  for (const cat of Object.keys(cats)) {
    const vals = getVals(cat, feat);
    if (vals.length === 0) continue;
    const m = mean(vals);
    const s = stddev(vals);
    const med = median(vals);
    table.push({ cat, mean: m, sd: s, median: med, n: vals.length, min: Math.min(...vals), max: Math.max(...vals) });
  }
  // print table
  console.log('  Cat             |   n |   mean |     σ | median |    min |    max');
  console.log('  ' + '-'.repeat(70));
  for (const r of table) {
    console.log(`  ${r.cat.padEnd(16)} | ${String(r.n).padStart(3)} | ${r.mean.toFixed(2).padStart(6)} | ${r.sd.toFixed(2).padStart(5)} | ${r.median.toFixed(2).padStart(6)} | ${r.min.toFixed(2).padStart(6)} | ${r.max.toFixed(2).padStart(6)}`);
  }
}

// === EFFECT SIZES: A vs C ===
console.log('\n' + '='.repeat(80));
console.log('EFFECT SIZES — Cohen\'s d (A-human-pre vs C-ai-co)');
console.log('d > 0.8 = large, d > 0.5 = medium, d > 0.2 = small');
console.log('Positive d means A is HIGHER than C');
console.log('='.repeat(80));

const effectSizes = [];
for (const feat of FEATURES) {
  const aVals = getVals('A-human-pre', feat);
  const cVals = getVals('C-ai-co', feat);
  if (aVals.length < 2 || cVals.length < 2) continue;
  const d = cohensD(aVals, cVals);
  const aM = mean(aVals);
  const cM = mean(cVals);
  effectSizes.push({ feat, d, aMean: aM, cMean: cM });
}

// sort by absolute effect size
effectSizes.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));

console.log('\n  Feature              | Cohen\'s d |  A mean |  C mean | Direction');
console.log('  ' + '-'.repeat(75));
for (const e of effectSizes) {
  const dir = e.d > 0 ? 'A > C (human higher)' : 'C > A (AI higher)';
  const strength = Math.abs(e.d) > 0.8 ? '***' : Math.abs(e.d) > 0.5 ? '**' : Math.abs(e.d) > 0.2 ? '*' : '';
  console.log(`  ${e.feat.padEnd(21)} | ${e.d.toFixed(2).padStart(8)}${strength.padEnd(3)} | ${e.aMean.toFixed(2).padStart(7)} | ${e.cMean.toFixed(2).padStart(7)} | ${dir}`);
}

// === EFFECT SIZES: A vs B (has human writing changed?) ===
console.log('\n' + '='.repeat(80));
console.log('EFFECT SIZES — Cohen\'s d (A-human-pre vs B-human-post)');
console.log('Testing: Has human writing changed in the post-LLM era?');
console.log('='.repeat(80));

const abEffects = [];
for (const feat of FEATURES) {
  const aVals = getVals('A-human-pre', feat);
  const bVals = getVals('B-human-post', feat);
  if (aVals.length < 2 || bVals.length < 2) continue;
  const d = cohensD(aVals, bVals);
  const aM = mean(aVals);
  const bM = mean(bVals);
  abEffects.push({ feat, d, aMean: aM, bMean: bM });
}
abEffects.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));

console.log('\n  Feature              | Cohen\'s d |  A mean |  B mean | Direction');
console.log('  ' + '-'.repeat(75));
for (const e of abEffects) {
  const dir = e.d > 0 ? 'A > B (pre higher)' : 'B > A (post higher)';
  const strength = Math.abs(e.d) > 0.8 ? '***' : Math.abs(e.d) > 0.5 ? '**' : Math.abs(e.d) > 0.2 ? '*' : '';
  console.log(`  ${e.feat.padEnd(21)} | ${e.d.toFixed(2).padStart(8)}${strength.padEnd(3)} | ${e.aMean.toFixed(2).padStart(7)} | ${e.bMean.toFixed(2).padStart(7)} | ${dir}`);
}

// === INDIVIDUAL PAGE SCORES — composite of best discriminators ===
console.log('\n' + '='.repeat(80));
console.log('INDIVIDUAL PAGE ANALYSIS — Top Discriminating Features');
console.log('='.repeat(80));

// Top discriminators (will be confirmed by the effect size output above)
// For now, show raw values of likely discriminators per page
const DISC_FEATURES = ['contractionPer1k', 'firstPersonPer1k', 'nomDensity', 'transitionPer1k', 'emdashPer1k', 'questionRate'];

console.log('\n  ' + 'Label'.padEnd(35) + DISC_FEATURES.map(f => f.substring(0, 12).padStart(13)).join(''));
console.log('  ' + '-'.repeat(35 + DISC_FEATURES.length * 13));

for (const row of rows) {
  const vals = DISC_FEATURES.map(f => {
    const v = parseFloat(row[f]);
    return isNaN(v) ? '      -' : v.toFixed(2).padStart(13);
  }).join('');
  console.log(`  ${(row.cat.substring(0, 1) + ':' + row.label).padEnd(35)}${vals}`);
}

// === HYPOTHESIS TESTS ===
console.log('\n' + '='.repeat(80));
console.log('HYPOTHESIS TEST RESULTS');
console.log('='.repeat(80));

const hypotheses = [
  {
    id: 'F1', name: 'Sentence length std-dev',
    feature: 'sentLenStdDev',
    hypothesis: 'LLMs produce more uniform lengths (lower σ)',
    direction: 'A > C expected'
  },
  {
    id: 'F2', name: 'Contraction rate',
    feature: 'contractionPer1k',
    hypothesis: 'Humans contract more',
    direction: 'A > C expected'
  },
  {
    id: 'F3', name: 'First-person rate',
    feature: 'firstPersonPer1k',
    hypothesis: 'Humans are more present in their text',
    direction: 'A > C expected'
  },
  {
    id: 'F4', name: 'Question rate',
    feature: 'questionRate',
    hypothesis: 'Humans ask more questions',
    direction: 'A > C expected'
  },
  {
    id: 'F5', name: 'Transition word density',
    feature: 'transitionPer1k',
    hypothesis: '"However/Moreover/Furthermore" is an LLM tell',
    direction: 'C > A expected'
  },
  {
    id: 'F6', name: 'Hedge word density',
    feature: 'hedgePer1k',
    hypothesis: 'Different distributions',
    direction: 'unclear'
  }
];

for (const h of hypotheses) {
  const aVals = getVals('A-human-pre', h.feature);
  const cVals = getVals('C-ai-co', h.feature);
  const bVals = getVals('B-human-post', h.feature);
  const d_ac = cohensD(aVals, cVals);
  
  console.log(`\n${h.id}: ${h.name} (${h.feature})`);
  console.log(`  Hypothesis: ${h.hypothesis}`);
  console.log(`  Expected: ${h.direction}`);
  console.log(`  A (pre-LLM human): mean=${mean(aVals).toFixed(2)}, σ=${stddev(aVals).toFixed(2)}, range=[${Math.min(...aVals).toFixed(1)}–${Math.max(...aVals).toFixed(1)}]`);
  console.log(`  B (post-LLM human): mean=${mean(bVals).toFixed(2)}, σ=${stddev(bVals).toFixed(2)}, range=[${Math.min(...bVals).toFixed(1)}–${Math.max(...bVals).toFixed(1)}]`);
  console.log(`  C (AI company): mean=${mean(cVals).toFixed(2)}, σ=${stddev(cVals).toFixed(2)}, range=[${Math.min(...cVals).toFixed(1)}–${Math.max(...cVals).toFixed(1)}]`);
  console.log(`  Cohen's d (A vs C): ${d_ac.toFixed(2)} (${Math.abs(d_ac) > 0.8 ? 'LARGE' : Math.abs(d_ac) > 0.5 ? 'MEDIUM' : Math.abs(d_ac) > 0.2 ? 'SMALL' : 'NEGLIGIBLE'})`);
  
  // verify direction
  if (h.direction.startsWith('A > C')) {
    console.log(`  Result: ${d_ac > 0.2 ? '✓ CONFIRMED' : d_ac > 0 ? '~ WEAK/INCONCLUSIVE' : '✗ REVERSED'} — A mean ${mean(aVals) > mean(cVals) ? '>' : '<'} C mean`);
  } else if (h.direction.startsWith('C > A')) {
    console.log(`  Result: ${d_ac < -0.2 ? '✓ CONFIRMED' : d_ac < 0 ? '~ WEAK/INCONCLUSIVE' : '✗ REVERSED'} — C mean ${mean(cVals) > mean(aVals) ? '>' : '<'} A mean`);
  } else {
    console.log(`  Result: d=${d_ac.toFixed(2)}, direction ${d_ac > 0 ? 'A > C' : 'C > A'}`);
  }
}

// === SIMPLE COMPOSITE EXPLORATION ===
console.log('\n' + '='.repeat(80));
console.log('COMPOSITE FEATURE EXPLORATION');
console.log('Can simple combinations separate the categories?');
console.log('='.repeat(80));

// For each page, compute a simple "human score" based on top discriminators
// Higher = more human-like
console.log('\nComposite: contractionPer1k + firstPersonPer1k - (transitionPer1k * 10) - (nomDensity * 5)');
console.log('(Positive features humans have more of, minus features AI has more of, scaled)');
console.log();

const composites = [];
for (const row of rows) {
  const contraction = parseFloat(row.contractionPer1k) || 0;
  const firstPerson = parseFloat(row.firstPersonPer1k) || 0;
  const transition = parseFloat(row.transitionPer1k) || 0;
  const nomDensity = parseFloat(row.nomDensity) || 0;
  
  const score = contraction + firstPerson - (transition * 10) - (nomDensity * 5);
  composites.push({ cat: row.cat, label: row.label, score, contraction, firstPerson, transition, nomDensity });
}

composites.sort((a, b) => b.score - a.score);

console.log('  Score   | Cat           | Label');
console.log('  ' + '-'.repeat(65));
for (const c of composites) {
  console.log(`  ${c.score.toFixed(1).padStart(7)} | ${c.cat.padEnd(13)} | ${c.label}`);
}

// per-category composite stats
console.log('\nComposite by category:');
for (const cat of Object.keys(cats)) {
  const scores = composites.filter(c => c.cat === cat).map(c => c.score);
  if (scores.length === 0) continue;
  console.log(`  ${cat.padEnd(16)}: mean=${mean(scores).toFixed(1)}, range=[${Math.min(...scores).toFixed(1)} – ${Math.max(...scores).toFixed(1)}]`);
}

// === WILLISON LONGITUDINAL ===
console.log('\n' + '='.repeat(80));
console.log('WILLISON LONGITUDINAL (Category E)');
console.log('='.repeat(80));

const eRows = (cats['E-willison'] || []);
if (eRows.length > 0) {
  console.log('\nNote: Two E entries (LLMHierarchies-2022, Gemini2Flash-2024) have identical data (61 words).');
  console.log('These are too short for reliable analysis — likely extraction artifacts.');
  console.log('\nUsable entries:');
  for (const r of eRows) {
    const words = parseInt(r.totalWords);
    if (words > 200) {
      console.log(`  ${r.label}: ${r.totalWords} words, contraction=${r.contractionPer1k}, firstPerson=${r.firstPersonPer1k}, nomDensity=${r.nomDensity}, transition=${r.transitionPer1k}`);
    } else {
      console.log(`  ${r.label}: ${r.totalWords} words — TOO SHORT, SKIP`);
    }
  }
}

// === DATA QUALITY WARNINGS ===
console.log('\n' + '='.repeat(80));
console.log('DATA QUALITY WARNINGS');
console.log('='.repeat(80));

const warnings = [];
for (const row of rows) {
  const words = parseInt(row.totalWords);
  if (words < 200) warnings.push(`${row.label}: only ${words} words — unreliable per-1k rates`);
}
// check for duplicate data
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    if (rows[i].totalWords === rows[j].totalWords && rows[i].totalSentences === rows[j].totalSentences &&
        rows[i].avgSentLen === rows[j].avgSentLen) {
      warnings.push(`DUPLICATE DATA: ${rows[i].label} and ${rows[j].label} have identical values — likely same page or extraction error`);
    }
  }
}
// category C has only 3 samples
warnings.push('Category C (AI company) has only 3 samples — effect sizes are noisy');
// category D is entirely missing
warnings.push('Category D (suspected LLM-heavy) has 0 samples — JS-rendered pages failed');

for (const w of warnings) {
  console.log(`  ⚠ ${w}`);
}

console.log('\n' + '='.repeat(80));
console.log('RECOMMENDATIONS FOR EXTENSION');
console.log('='.repeat(80));

console.log(`
Based on the analysis above, the top discriminating features (pending effect size confirmation) are:

1. CONTRACTION RATE — human writers contract; AI company blogs don't.
   Action: Add inline highlighting for contractions (green = human signal).
   
2. FIRST-PERSON RATE — humans are present in their text; AI writes from nowhere.
   Action: Add to badge as a humanness signal.

3. NOMINALISATION DENSITY — already in the extension. Confirmed as discriminator.
   Action: Keep current implementation. Threshold ~2.5% separates human (lower) from AI (higher).

4. TRANSITION WORD DENSITY — "However/Moreover/Furthermore" signals.
   Action: Add inline highlighting for formal transition words (warm color = AI signal).

5. EM-DASH RATE — complex picture. Some humans use many, some use none. AI uses them.
   Action: Keep current highlighting. Not a clean discriminator alone.

Features that DO NOT discriminate (should NOT be used for detection):
- Sentence length std-dev (human variance is huge, overlaps with AI)
- Structural detectors per-1k (epigram, isocolon, antithesis, anadiplosis) — 
  these measure rhetorical quality, not generation source. Good humans score high too.
`);
