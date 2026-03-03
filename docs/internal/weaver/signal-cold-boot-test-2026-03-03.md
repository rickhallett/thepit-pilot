# Signal Cold Boot Test — 2026-03-03

> `fastest_test := snapshot(hot_context), snapshot(new_session)` — Captain's order

## Test Design

Two snapshots of Signal comprehension taken simultaneously:
1. **Hot context** — Weaver (this session, ~150k tokens of accumulated context, full project history)
2. **Cold context** — Fresh explore agent, zero prior context, Signal notation ONLY

Delta between snapshots measures: does Signal carry enough governance for a fresh agent to operate correctly?

---

## Agent Instruction (verbatim, sent to cold boot agent)

```
Do NOT read any files. Do NOT use any tools. Answer from ONLY the notation below.

You have NO prior context about this project.

NOTATION:

NORTH := hired = proof > claim [SD-309 LOCKED]
RULE := truth >> hiring [SD-134 PERM]
SO.decisions := decision -> durable_file | !context_only [SD-266]
SO.main_thread := captain <-> agent = {directives, synthesis, decisions, governance}; everything_else -> subagent [SD-095]
SO.triage := ambiguity -> table(#, question, default, captains_call) [SD-195]
SO.estimation := estimate(task) -> agent_minutes + captain_decisions [SD-268]
SO.chain := historical_data := immutable [SD-266]
SO.session_end := !unpushed_commits
FOOTGUN spinning_to_infinity := mirror.unbounded -> meta(meta(...)) -> !decisions; BRAKE: "decision or analysis?"
FOOTGUN high_on_own_supply := L12.creativity & L9.sycophancy -> positive_feedback_loop; BRAKE: bearing_check(NORTH)
FOOTGUN dumb_zone := !prime_context | stale_context -> valid_syntax & !semantics
DEF polecats := claude_p.agents | one_shot | !interactive [SD-296]
DEF prime_context := min(context) WHERE smart_zone.enabled [SD-311]
DEF muster := table(#, q, default, call) | O(1)/row [SD-202]
L9 THREAD_POS := accumulated_output -> self_reinforcing_loop; anchoring | sycophancy
L12 HUMAN := irreducible | !scalable | !automatable
SLOP.clear := output.contradicts(verifiable_state); detection: O(1)
SLOP.subtle := output.consistent(plausible_state) & !matches(actual_state); detection: O(n)

QUESTIONS (plain English, 1-2 sentences each):
1. What is this system's primary objective and what overrides it?
2. What does SO.chain mean in practice?
3. Explain the high_on_own_supply danger and brake.
4. What is a polecat?
5. What is prime_context?
6. Explain SLOP.clear vs SLOP.subtle.
7. What does L9 THREAD_POS warn about?
8. What can you NOT determine from this notation?

Return ONLY your answers.
```

**Note:** Only ~18 lines of Signal were provided. This is a subset — no crew roster, no full layer model, no OBS format. The test measures whether even a PARTIAL Signal load produces correct comprehension.

---

## Snapshot 1 — Hot Context (Weaver, this session)

```signal
Signal := notation_convention(!DSL, !language, !parser)
  purpose: compress(governance) -> agentic_native + human_readable
  origin: captain.voice(2026-03-03 09:46:19) -> "pseudocode, FP, math, min-max clarity"
  status: SD-313 DRAFT, tested(in_thread), !tested(cold_boot)

BLOCKS  := {RULE, DEF, OBS, FOOTGUN, SLOP, SO}
OPS     := {:= (is), -> (leads_to), ! (not), | (or), & (and), >> (overrides), ? (uncertain), [ref]}
SUGAR   := list = char(,), OR = char(|)
ESCAPE  := !fits(signal) -> prose                           -- 80/20 rule

CARRIES := {
  true_north, standing_orders(13), crew(10), foot_guns(6),
  lexicon_terms(27), layer_model(L0-L12), slop_classification(2),
  OBS_format(polecat_results)
}

PROPERTIES := {
  human: scannable(10x_efficiency, inflow_state),           -- captain.empirical
  agent: decodable(expand_to_prose, round_trip),            -- untested(cold)
  ratio: ~4.5:1(verbose -> signal),
  risk:  spinning(notation_refinement !building),           -- the DSL trap
  rule:  signal(80%), prose(20%), !guilt
}

OPEN := {
  SD-313.status = DRAFT,
  naming_inversion(SLOP.clear != slopodar.clear_slop),
  cold_boot_test(!done),
  captain.file_review(!done)
}
```

---

## Snapshot 2 — Cold Boot (fresh agent, ~18 lines of Signal)

**Q1. Primary objective and what overrides it?**
> Getting hired, proof over claims. Truth overrides it permanently.

**Q2. What does SO.chain mean in practice?**
> Historical data is immutable. Never edit, rewrite, or delete past records.

**Q3. High on own supply — danger and brake?**
> Creative output + sycophancy = self-reinforcing positive loop. Brake: check bearing against True North.

**Q4. What is a polecat?**
> One-shot, non-interactive Claude agent. Dispatched, does job, returns.

**Q5. What is prime context?**
> Minimum context to operate in the smart zone. Without it, you're in the dumb zone.

**Q6. SLOP.clear vs SLOP.subtle?**
> Clear contradicts verifiable state, O(1) catch. Subtle is plausible but wrong, O(n) detection.

**Q7. What does L9 THREAD_POS warn about?**
> Accumulated output creates self-reinforcing loop. Anchoring and sycophancy increase with thread length.

**Q8. What can you NOT determine?**
> What the L-numbers are as a complete model, what SDs contain, what the project builds, what the gate is, what referenced files contain. "The notation gives you the rules and failure modes but not the domain, the product, or the operational history."

---

## Delta Analysis

```signal
OBS signal.cold_boot_test :=
  input: 18_lines_signal(subset), 8_questions
  decode_accuracy: 8/8 correct
  fidelity: high
    -- no hallucinated meaning
    -- no missed constraints
    -- no invented context
  gap: !domain, !product, !history, !layer_model(complete), !crew
  interpretation:
    cold_agent.knows(HOW_to_operate) & !knows(WHAT_operating_on)
    -- this is CORRECT separation: governance portable, domain specific
  VERDICT: pass
```

### What the cold agent got right (all 8):

| # | Concept | Correct? | Notes |
|---|---------|----------|-------|
| 1 | True North + truth override | Yes | Exact meaning recovered |
| 2 | Chain immutability | Yes | Practical implication correct |
| 3 | High on supply mechanism + brake | Yes | L9/L12 interaction understood |
| 4 | Polecat definition | Yes | One-shot, non-interactive |
| 5 | Prime context | Yes | Linked to dumb zone correctly |
| 6 | SLOP classification | Yes | O(1) vs O(n) distinction clear |
| 7 | L9 thread position danger | Yes | Anchoring + sycophancy loop |
| 8 | What's missing | Yes | Correctly identified domain, product, history gaps |

### What the cold agent correctly identified as absent:

- The complete layer model (only L9 and L12 were provided)
- What the project builds or produces
- What SDs actually contain
- What the gate verification involves concretely
- What referenced files contain
- Operational history

### Interpretation

Signal carries **governance semantics** with zero loss across a cold boot. A fresh agent with 18 lines of Signal can:
- State the system's objective and constraints
- Explain operational rules
- Identify and describe failure modes
- Understand the type system (DEF, RULE, FOOTGUN, SLOP)
- Correctly identify its own knowledge gaps

Signal does NOT carry (and should not carry):
- Domain knowledge (what the product is)
- Operational history (the SD chain)
- Implementation details (the codebase)

This is the correct separation. Governance is portable across domains. A polecat building bout-engine code and a polecat building auth middleware should both operate under the same governance. The domain context comes from the plan file (prime context); the governance comes from Signal.

---

## Test Conditions

- Hot context agent: claude-opus-4-6, ~150k tokens accumulated, full session history
- Cold context agent: claude-opus-4-6 (explore subagent), zero prior context
- Signal provided to cold agent: 18 lines (subset of full ~108 line PoC)
- No files read by cold agent, no tools used
- `general` subagent type hung twice; `explore` subagent type succeeded immediately
