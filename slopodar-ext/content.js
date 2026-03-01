// slopodar v0.2.0 — calibration-informed LLM text pattern detector
// no AI, no server, no model. vanilla JS heuristics.
//
// architecture:
//   - text-node highlighters (em-dash, abstract noun, transition word) run inline
//   - structural detectors (epigram, anadiplosis, isocolon, antithesis, nom density)
//     run on a raw sentence stream — no DOM structure dependency
//   - voice markers (contractions, first-person, questions, transitions) from v2 calibration
//   - results shown in floating badge: voice section (discriminators) + rhetoric section (informational)

(function slopodar() {
  'use strict';

  // find the best content root
  var root = document.querySelector('article') ||
             document.querySelector('main') ||
             document.querySelector('.content') ||
             document.querySelector('.post') ||
             document.querySelector('.entry') ||
             document.body;

  if (!root) return;

  // skip text nodes inside these elements
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1, SVG: 1, INPUT: 1, BUTTON: 1, NAV: 1 };

  // === RESULTS OBJECT ===
  var results = {
    // inline highlighters
    emdash: 0,
    absnoun: 0,
    transition: 0,
    // structural detectors
    epigram: 0,
    anadiplosis: 0,
    isocolon: 0,
    antithesis: 0,
    // voice markers (from calibration v2)
    totalWords: 0,
    totalSentences: 0,
    nomDensity: 0,
    contractions: 0,
    firstPerson: 0,
    questions: 0
  };

  // === PHASE 1: sentence stream analysis ===
  // extract visible text, split into sentences, run all analysis

  var fullText = '';
  var sentences = [];

  (function () {
    // gather all visible text from content root
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var chunks = [];
    while (walk.nextNode()) {
      if (!SKIP_TAGS[walk.currentNode.parentNode.tagName]) {
        var t = walk.currentNode.textContent.trim();
        if (t) chunks.push(t);
      }
    }
    fullText = chunks.join(' ');
    if (!fullText) return;

    // count total words
    var allWords = fullText.split(/\s+/).filter(function (w) { return w.length > 0; });
    results.totalWords = allWords.length;

    // split into sentences
    sentences = fullText.split(/(?<=[.!?])\s+/).filter(function (s) {
      return s.trim().length > 0;
    });
    results.totalSentences = sentences.length;

    if (sentences.length < 2) return;

    // --- nominalisation density (whole text) ---
    var absRe = /\b\w+(?:tion|ment|ness|ity|ence|ance)\b/gi;
    var absMatches = fullText.match(absRe);
    var absCount = absMatches ? absMatches.length : 0;
    if (results.totalWords > 0) {
      results.nomDensity = ((absCount / results.totalWords) * 100).toFixed(1);
    }

    // --- voice markers (calibration v2 discriminators) ---

    // contractions
    var contractRe = /\b(don't|won't|can't|it's|I'm|you're|they're|we're|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|didn't|doesn't|I'll|you'll|we'll|they'll|I've|you've|we've|they've|I'd|you'd|we'd|they'd|he's|she's|that's|what's|there's|here's|let's|who's)\b/gi;
    var contractMatches = fullText.match(contractRe);
    results.contractions = contractMatches ? contractMatches.length : 0;

    // first-person pronouns
    var fpRe = /\b(I|me|my|mine|myself)\b/g;
    var fpMatches = fullText.match(fpRe);
    results.firstPerson = fpMatches ? fpMatches.length : 0;

    // questions
    var qCount = 0;
    for (var q = 0; q < sentences.length; q++) {
      if (sentences[q].trim().match(/\?$/)) qCount++;
    }
    results.questions = qCount;

    // --- per-sentence-pair analysis ---
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];
      var sClean = s.replace(/[.!?]+$/, '').trim();
      var sWords = sClean.split(/\s+/).filter(function (w) { return w.length > 0; });

      // epigrammatic closure: short sentence (≤6 words) after a longer one (>10 words)
      if (i > 0 && sWords.length > 0 && sWords.length <= 6) {
        var prevClean = sentences[i - 1].replace(/[.!?]+$/, '').trim();
        var prevWords = prevClean.split(/\s+/).filter(function (w) { return w.length > 0; });
        if (prevWords.length > 10) {
          results.epigram++;
        }
      }

      // antithesis: negation contrast patterns in this sentence
      var antiPatterns = [
        /\bnot\s+\w+[,;]\s*but\b/i,
        /\b\w+[,;]\s*not\s+\w+/i,
        /\brather\s+than\b/i,
        /\binstead\s+of\b/i,
        /\bnothing\s+was\b/i,
        /\bnot\s+through\b.*\bthrough\b/i,
        /\bnot\s+just\b/i
      ];
      for (var ap = 0; ap < antiPatterns.length; ap++) {
        if (antiPatterns[ap].test(s)) { results.antithesis++; break; }
      }

      // pair-based detectors (need next sentence)
      if (i < sentences.length - 1) {
        var nextClean = sentences[i + 1].replace(/[.!?]+$/, '').trim();
        var nextWords = nextClean.split(/\s+/).filter(function (w) { return w.length > 0; });

        // isocolon: consecutive sentences within ±1 word, both ≥5 words
        if (sWords.length >= 5 && nextWords.length >= 5 && Math.abs(sWords.length - nextWords.length) <= 1) {
          results.isocolon++;
        }

        // anadiplosis: last content word of sentence i in first 3 words of sentence i+1
        var tail = sWords.slice(-2).map(function (w) { return w.toLowerCase().replace(/[^a-z]/g, ''); });
        var head = nextWords.slice(0, 3).map(function (w) { return w.toLowerCase().replace(/[^a-z]/g, ''); });
        for (var k = 0; k < tail.length; k++) {
          if (tail[k].length < 4) continue;
          var hFound = false;
          for (var l = 0; l < head.length; l++) {
            if (tail[k] === head[l]) { hFound = true; break; }
          }
          if (hFound) { results.anadiplosis++; break; }
        }
      }
    }
  })();

  // === PHASE 2: text-node highlighters (inline, works everywhere) ===

  // 1. transition word highlighter (#1 discriminator, d = -4.36)
  (function () {
    var re = /\b(However|Moreover|Furthermore|Additionally|Consequently|Nevertheless|Nonetheless|Importantly|Specifically|Ultimately|Fundamentally|Indeed|Notably|Interestingly|Crucially|Essentially|Particularly)\b/g;
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walk.nextNode()) {
      if (!SKIP_TAGS[walk.currentNode.parentNode.tagName]) nodes.push(walk.currentNode);
    }
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!re.test(node.textContent)) continue;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var text = node.textContent;
      var lastIdx = 0;
      var match;
      while ((match = re.exec(text)) !== null) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }
        count++;
        var span = document.createElement('span');
        span.className = 'sloptics-transition';
        span.setAttribute('data-n', count);
        span.textContent = match[0];
        frag.appendChild(span);
        lastIdx = re.lastIndex;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      node.parentNode.replaceChild(frag, node);
    }
    results.transition = count;
  })();

  // 2. em-dash highlighter
  (function () {
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walk.nextNode()) {
      if (!SKIP_TAGS[walk.currentNode.parentNode.tagName]) nodes.push(walk.currentNode);
    }
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.textContent.indexOf('\u2014') === -1) continue;
      var frag = document.createDocumentFragment();
      var parts = node.textContent.split('\u2014');
      for (var j = 0; j < parts.length; j++) {
        if (j > 0) {
          count++;
          var span = document.createElement('span');
          span.className = 'sloptics-emdash';
          span.setAttribute('data-n', count);
          span.textContent = '\u2014';
          frag.appendChild(span);
        }
        if (parts[j]) frag.appendChild(document.createTextNode(parts[j]));
      }
      node.parentNode.replaceChild(frag, node);
    }
    results.emdash = count;
  })();

  // 3. abstract noun highlighter
  (function () {
    var re = /\b(\w+(?:tion|ment|ness|ity|ence|ance))\b/gi;
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walk.nextNode()) {
      if (!SKIP_TAGS[walk.currentNode.parentNode.tagName]) nodes.push(walk.currentNode);
    }
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!re.test(node.textContent)) continue;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var text = node.textContent;
      var lastIdx = 0;
      var match;
      while ((match = re.exec(text)) !== null) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }
        count++;
        var span = document.createElement('span');
        span.className = 'sloptics-absnoun';
        span.setAttribute('data-n', count);
        span.textContent = match[0];
        frag.appendChild(span);
        lastIdx = re.lastIndex;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      node.parentNode.replaceChild(frag, node);
    }
    results.absnoun = count;
  })();

  // === PHASE 3: floating summary badge ===

  // don't show badge if almost nothing was detected (e.g. image-heavy page)
  if (results.totalWords < 50) return;

  // compute per-1k rates for badge display
  var per1k = function (count) {
    return results.totalWords > 0 ? ((count / results.totalWords) * 1000).toFixed(1) : '0';
  };
  var pctSent = function (count) {
    return results.totalSentences > 0 ? ((count / results.totalSentences) * 100).toFixed(1) : '0';
  };

  var badge = document.createElement('div');
  badge.id = 'slopodar-badge';

  // badge is two sections: VOICE (calibrated discriminators) + RHETORIC (informational)
  var html = '<div class="slopodar-title">slopodar <span class="slopodar-version">v0.2</span></div>';

  // --- VOICE section: calibration-backed discriminators ---
  html += '<div class="slopodar-section-label">voice</div>';

  var voiceRows = [
    ['\u2049', 'questions', pctSent(results.questions) + '%', results.questions > 0],
    ['\u{1D4D8}', 'first person', per1k(results.firstPerson) + '/k', results.firstPerson > 0],
    ['\u2019', 'contractions', per1k(results.contractions) + '/k', results.contractions > 0],
    ['\u2234', 'transitions', per1k(results.transition) + '/k', results.transition > 0],
    ['%', 'nom density', results.nomDensity + '%', parseFloat(results.nomDensity) > 0]
  ];

  for (var v = 0; v < voiceRows.length; v++) {
    var vr = voiceRows[v];
    // transitions and nom density: higher = more AI-like (warm). others: higher = more human (green)
    var isHumanSignal = (v <= 2); // questions, first-person, contractions
    var isAISignal = (v === 3 || v === 4); // transitions, nom density
    var colorClass = '';
    if (vr[3]) {
      if (isHumanSignal) colorClass = ' slopodar-human';
      else if (isAISignal) colorClass = ' slopodar-ai';
      else colorClass = ' slopodar-hit';
    }
    html += '<div class="slopodar-row">' +
      '<span class="slopodar-icon">' + vr[0] + '</span>' +
      '<span class="slopodar-label">' + vr[1] + '</span>' +
      '<span class="slopodar-val' + colorClass + '">' + vr[2] + '</span>' +
    '</div>';
  }

  // --- RHETORIC section: structural detectors (informational, not discriminating) ---
  html += '<div class="slopodar-section-label">rhetoric</div>';

  var rhetRows = [
    ['\u2014', 'em-dash', results.emdash, results.emdash > 0],
    ['\u00b6', 'abs noun', results.absnoun, results.absnoun > 0],
    ['\u23ce', 'epigram', results.epigram, results.epigram > 0],
    ['\u2194', 'isocolon', results.isocolon, results.isocolon > 0],
    ['\u00ac', 'antithesis', results.antithesis, results.antithesis > 0],
    ['\u2248', 'anadiplosis', results.anadiplosis, results.anadiplosis > 0]
  ];

  for (var r = 0; r < rhetRows.length; r++) {
    var rr = rhetRows[r];
    html += '<div class="slopodar-row">' +
      '<span class="slopodar-icon">' + rr[0] + '</span>' +
      '<span class="slopodar-label">' + rr[1] + '</span>' +
      '<span class="slopodar-val' + (rr[3] ? ' slopodar-hit' : '') + '">' + rr[2] + '</span>' +
    '</div>';
  }

  html += '<div class="slopodar-footer">' + results.totalWords + ' words · ' + results.totalSentences + ' sentences</div>';

  badge.innerHTML = html;
  document.body.appendChild(badge);

  // make badge draggable
  var dragging = false, dx = 0, dy = 0;
  badge.addEventListener('mousedown', function (e) {
    dragging = true;
    dx = e.clientX - badge.getBoundingClientRect().left;
    dy = e.clientY - badge.getBoundingClientRect().top;
    badge.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    badge.style.right = 'auto';
    badge.style.bottom = 'auto';
    badge.style.left = (e.clientX - dx) + 'px';
    badge.style.top = (e.clientY - dy) + 'px';
  });
  document.addEventListener('mouseup', function () {
    dragging = false;
    badge.style.cursor = 'grab';
  });
})();
