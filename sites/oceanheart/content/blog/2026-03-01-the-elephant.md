+++
title = "33,700 tokens on boot and nobody noticed"
date = "2026-03-01"
description = "I built a token heatmap of my entire repository. The biggest file in the boot sequence was the session decisions log. It loads every time an agent wakes up. 33,700 tokens of historical decisions that no agent needs to read in full to do its job."
tags = ["agents", "tokens", "infrastructure", "discipline"]
draft = false
+++

> **Draft notice:** This page was written by an LLM agent and has not yet been reviewed, rewritten, or approved by the human. It exists as raw material. The human will come back to it, read it with fresh eyes, and either rewrite it in his own voice or throw it away entirely. That's the process. If you're reading this before that happens, you're reading an agent's first draft, not a finished article.

## The heatmap

I run a multi-agent system with 13 agents, 271 session decisions on file, and a governance framework that requires every agent to read the ship's standing orders on boot. Today I pointed a tokeniser at the entire repository and asked: how much does it cost, in tokens, just to wake up?

```
  BOOT SEQUENCE (read on every agent wake)

    33.7k  ████████████████████████████████████████  session-decisions.md
     6.2k  ████████                                  analyst.md
     4.6k  ██████                                    lexicon.md
     4.6k  ██████                                    quartermaster.md
     4.3k  ██████                                    AGENTS.md
     3.2k  ████                                      architect.md
     2.7k  ████                                      anotherpair.md
     2.6k  ████                                      weaver.md
     2.5k  ███                                       watchdog.md
     2.5k  ███                                       sentinel.md
     2.4k  ███                                       janitor.md
     2.3k  ███                                       dead-reckoning.md
     2.0k  ███                                       scribe.md
     1.7k  ███                                       keel.md
     1.2k  ██                                        maturin.md
  ───────
   112.9k  BOOT TOTAL
```

One file is 30% of the boot sequence. It's the session decisions log: an append-only record of every decision made across every session since the project started. 271 entries. 496 lines. 68 tokens per line.

It loads every time.

## Why it loads

The session decisions log is the canonical record of what was decided, when, and by whom. When an agent wakes up after a context window dies, the dead reckoning protocol says: read the session decisions file. It's the fastest way to reconstruct the state of the world.

The problem is that standing order doesn't say "read the last 10 decisions." It says "read the file." So the agent reads all 271 decisions, including the one from three weeks ago about whether to use em-dashes in copy.

## The algorithm

```
files       = git ls-files
tokenizer   = cl100k_base (GPT-4 compatible)

for file in files:
    skip if binary
    tokens  = encode(file.content).length
              + encode(file.path).length
    record  { path, tokens, boot_flag }

sort by tokens descending
aggregate by directory
tag boot sequence files
```

Time to build: 5 agent-minutes.
Time to run: 3 seconds.
Time to find the elephant: instant.

[Full provenance: token-heatmap.yaml on GitHub](https://github.com/rickhallett/thepit/blob/master/docs/internal/weaver/token-heatmap.yaml) | [The script](https://github.com/rickhallett/thepit/blob/master/bin/token-heatmap.js)

## The fix (not yet implemented)

The session decisions file is append-only. That's a standing order ([SD-266](https://github.com/rickhallett/thepit/blob/master/docs/internal/session-decisions.md)). History is immutable. The delta between past and present is the signal. So the file stays.

The fix is to stop loading the whole thing on boot. A summary index, the last 10 decisions plus a count, would drop 30,000 tokens from the boot sequence. That's roughly 30,000 tokens of context window recovered on every single agent wake.

At current API pricing, that's not nothing. At 100 agent wakes per day across a team, it adds up.

## Was it obvious?

Kind of. The way a 2-metre elephant in the room is obvious. Everyone can see it. Nobody counts it. Until you point a tokeniser at it and the bar chart speaks for itself.

The heatmap took 5 minutes to build. The insight it surfaced will save tokens on every agent invocation for the rest of the project's life. That's the kind of return that makes infrastructure work worth doing, even when there are features to ship.

We're going fast. The heatmap is how we check we're not burning fuel on the way.
