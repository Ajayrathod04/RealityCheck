# 👻 RealityCheck

[![Rote Play](https://img.shields.io/badge/Rote%20Play-reality--check%400.1.0-blue)](https://play.modiqo.ai/ajayrathod04/reality-check@0.1.0)
[![Node.js](https://img.shields.io/badge/Node.js-required-339933)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Play-Released-brightgreen)](https://play.modiqo.ai/ajayrathod04/reality-check@0.1.0)
[![Version](https://img.shields.io/badge/Version-0.1.0-blue)](https://play.modiqo.ai/ajayrathod04/reality-check@0.1.0)

> **Can this workflow be trusted when run again?**

> **Can this workflow be trusted when run again?**

RealityCheck is a reproducibility-investigation **Rote Play** that runs the same workflow through a controlled three-run sequence, compares the observable result and artifact evidence, detects hidden persistent state, and explains *why* a replay changed.

It is designed around one practical question:

> **If I run the exact same workflow again, can I trust the result?**

---

## 🎯 What RealityCheck Solves

A workflow can pass once and still be unreliable.

A second run may behave differently because of:

- cached state
- persistent files
- previous execution artifacts
- hidden local state
- state that survives between runs

A simple `PASS`/`FAIL` check does not explain this.

RealityCheck investigates the difference.

It establishes a clean baseline, performs a warm replay with the same input, then resets the persistent state and verifies the workflow again.

### Output

RealityCheck classifies the workflow as:

| Verdict | Meaning |
|---|---|
| `REPRODUCIBLE` | Clean, warm replay, and reset replay agree |
| `DRIFTING` | Results differ, but the difference is not explained as persistent hidden state |
| `STATE-DEPENDENT` | Warm replay changes because prior persistent state is observed, while reset returns to the clean result |

The important part is that RealityCheck reports **evidence of WHY**, not merely that two runs differ.

---

# 🧠 Core Idea

RealityCheck combines three ideas into one judge-facing Play:

- **ReplayDiff** — compare the baseline and replay
- **ColdStart Forge** — clean/reset verification
- **StateGhost** — detect hidden persistent state

These are implementation concepts, **not separate judge-facing features**.

The Play is presented as one cohesive reproducibility investigation:

> **RealityCheck**

This keeps the Play focused instead of becoming a collection of unrelated scanners or utilities.

---

# 🔄 Three-Run Flow

```text
                    ┌───────────────────┐
                    │   CLEAN RUN A     │
                    │                   │
                    │ Fresh state       │
                    │ Baseline result   │
                    │ Baseline artifact │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   WARM REPLAY B   │
                    │                   │
                    │ Same workflow     │
                    │ Same input        │
                    │ Existing state    │
                    └─────────┬─────────┘
                              │
                    Compare A ↔ B
                              │
                              ▼
                    ┌───────────────────┐
                    │   RESET RUN C     │
                    │                   │
                    │ Remove state      │
                    │ Run again         │
                    │ Verify baseline   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │      VERDICT      │
                    │                   │
                    │ REPRODUCIBLE     │
                    │ DRIFTING         │
                    │ STATE-DEPENDENT  │
                    └───────────────────┘
```

---

# 👻 Hidden-State Detection

The key demonstration is a workflow whose observable artifact changes after state has been created.

Example:

```text
CLEAN
REALITYCHECK-DEMO

WARM REPLAY
REALITYCHECK-DEMO + WARM_STATE

RESET
REALITYCHECK-DEMO
```

RealityCheck observes:

```text
CLEAN  →  WARM       DIFFERENT
CLEAN  →  RESET      MATCH
```

and reports:

```text
👻 HIDDEN STATE DETECTED
```

with evidence such as:

```text
PATH       → /tmp/realitycheck-state/.cache
CLEAN      → REALITYCHECK-DEMO
WARM       → REALITYCHECK-DEMO + WARM_STATE
RESET      → REALITYCHECK-DEMO
OBSERVED   → YES — prior state detected
RESET      → YES — state removed
```

The resulting classification is:

```text
STATE-DEPENDENT
```

Recommendation:

```text
Recommendation: declare or remove persistent state.
```

---

# 🧪 Actual Demonstrated Run

The release-candidate run completed all three DAG steps successfully:

```text
Running DAG play 'reality-check' (3 steps)...

✔ Clean Run
✔ Warm Replay
✔ Reset Run

Summary: 3/3 completed, 0 failed, 0 blocked
```

Observed result:

```text
CLEAN        [OK] PASS     98a928f7acce
WARM REPLAY  [!!] CHANGED  72d873c510c1
RESET        [OK] PASS     98a928f7acce
```

Evidence:

```text
Δ artifact.txt → content changed between clean and warm replay

PATH       → /tmp/realitycheck-state/.cache
CLEAN      → REALITYCHECK-DEMO
WARM       → REALITYCHECK-DEMO + WARM_STATE
RESET      → REALITYCHECK-DEMO
OBSERVED   → YES — prior state detected
RESET      → YES — state removed
```

Final verdict:

```text
STATE-DEPENDENT
```

This is the intended RealityCheck judge moment.

---

# 🧩 Architecture

```text
main.ts
│
├── Clean Run
│   └── resources/clean-run.mjs
│
├── Warm Replay
│   └── resources/warm-run.mjs
│
├── Reset Run
│   └── resources/reset-run.mjs
│
├── lib/reality.ts
│   └── snapshot + comparison logic
│
├── lib/evidence.ts
│   └── human-readable difference explanation
│
└── deps.toml
    └── dependency declaration
```

---

# 📁 Repository Structure

```text
reality-check/
├── main.ts
├── deps.toml
├── lib/
│   ├── reality.ts
│   └── evidence.ts
└── resources/
    ├── clean-run.mjs
    ├── warm-run.mjs
    └── reset-run.mjs
```

---

# ⚙️ How It Works

## 1. Clean Run

The first execution establishes the baseline.

RealityCheck records:

- workflow result
- artifact content
- execution hash
- relevant state observations

This becomes the reference point.

---

## 2. Warm Replay

The workflow is executed again with the same input while persistent state from the first execution remains available.

RealityCheck compares the warm result against the clean baseline.

If the result changes, the Play investigates the observable evidence.

---

## 3. Reset Run

The persistent state is removed.

The workflow is executed again from a clean state.

If the reset result returns to the original clean result, the difference observed during warm replay is strong evidence of state dependence.

---

## 4. Evidence Generation

RealityCheck does not stop at:

```text
DIFFERENT
```

It explains the observable difference.

Example:

```text
Δ artifact.txt → content changed between clean and warm replay
```

It also exposes the relevant state path and whether state was observed or removed.

---

## 5. Final Classification

```text
Clean == Warm
Clean == Reset
        │
        ├── YES / YES
        │      └── REPRODUCIBLE
        │
        ├── NO / YES
        │      └── STATE-DEPENDENT
        │
        └── otherwise
               └── DRIFTING
```

---

# 🖥️ Human Output

RealityCheck presents a compact investigation report:

```text
+======================================================================+
| REALITYCHECK                                                         |
| Can this workflow be trusted when run again?                         |
+======================================================================+
|                                                                      |
|  RUN          STATUS        HASH                                     |
|  ------------------------------------------------------------------  |
|  CLEAN        [OK] PASS    98a928f7acce                              |
|  WARM REPLAY  [!!] CHANGED 72d873c510c1                              |
|  RESET        [OK] PASS    98a928f7acce                              |
|                                                                      |
+======================================================================+
| RESULT                                                               |
|                                                                      |
|  HIDDEN STATE DETECTED                                               |
|                                                                      |
+----------------------------------------------------------------------+
| EVIDENCE                                                             |
|                                                                      |
|  PATH       -> /tmp/realitycheck-state/.cache                        |
|  CLEAN      -> REALITYCHECK-DEMO                                     |
|  WARM       -> REALITYCHECK-DEMO + WARM_STATE                        |
|  RESET      -> REALITYCHECK-DEMO                                     |
|  OBSERVED   -> YES — prior state detected                            |
|  RESET      -> YES — state removed                                   |
|                                                                      |
+----------------------------------------------------------------------+
| VERDICT                                                              |
|                                                                      |
|  STATE-DEPENDENT                                                     |
|                                                                      |
+======================================================================+
```

---

# 📊 Verdict Table

| Clean vs Warm | Clean vs Reset | Verdict |
|---|---|---|
| Match | Match | `REPRODUCIBLE` |
| Different | Match | `STATE-DEPENDENT` |
| Different | Different | `DRIFTING` |
| Match | Different | `DRIFTING` |

---

# 🧰 Commands

## Validate

```bash
rote play validate main.ts
```

Expected:

```text
OK: Play validation passed!
Quality score: 0.88 (Pass)
```

---

## Dependency Preflight

```bash
rote deps check deps.toml
```

Expected:

```text
ok: dependency preflight passed
```

---

## Run RealityCheck

```bash
rote play run main.ts
```

For a clean demonstration:

```bash
rm -rf /tmp/realitycheck-state
rote play run main.ts
```

---

## Release

```bash
rote play release reality-check
```

---

## Publish to Community / Public Registry

```bash
rote registry play push /home/ajay/.rote/flows/ajayrathod04/reality-check/main.ts ajayrathod04
```

Published reference:

```text
ajayrathod04/reality-check@0.1.0
```

Public Play:

```text
https://play.modiqo.ai/ajayrathod04/reality-check@0.1.0
```

---

## Pull the Published Play

```bash
rote registry play pull ajayrathod04/reality-check
```

---

## Index Released Plays

```bash
rote play index --rebuild
```

---

## Search / Verify Discoverability

```bash
rote play search reality-check
```

---

# 📦 Version

```text
Name:    reality-check
Version: 0.1.0
Status:  Released
Visibility: Public
Play reference: ajayrathod04/reality-check@0.1.0
```

---

# 🔗 Links

**GitHub**

```text
https://github.com/Ajayrathod04/RealityCheck
```

**Rote Play**

```text
https://play.modiqo.ai/ajayrathod04/reality-check@0.1.0
```

**Bootstrap / Install**

```text
https://play.modiqo.ai/install?play=ajayrathod04/reality-check@0.1.0
```

---

# 🏆 Why This Is Different

RealityCheck is deliberately **not** positioned as:

- a generic environment scanner
- a security scanner
- a promise checker
- a root-cause scanner
- a gap mapper
- an AEO tool
- a generic before/after environment diff

Its focus is narrower:

> **Investigate whether a workflow remains trustworthy when replayed.**

The key distinction is the controlled sequence:

```text
BASELINE
   ↓
WARM REPLAY
   ↓
RESET
   ↓
COMPARE
   ↓
EXPLAIN
   ↓
CLASSIFY
```

This makes reproducibility itself the investigation target.

---

# 🎯 Judge Moment

The intended experience is:

```text
RUN A
✓ PASS

REPLAY
✓ EXECUTED
⚠ CHANGED

CLEAN REPLAY
✓ PASS
```

Then:

```text
👻 HIDDEN STATE DETECTED
```

followed by concrete evidence:

```text
.cache/...
artifact changed
state observed
reset restored baseline
```

and finally:

```text
STATE-DEPENDENT
```

The judge does not need to understand separate internal components.

They see one useful Play answering one practical question.

---

# 🎨 UI Direction

The presentation is designed around:

```text
👻 Ghost-state visual
        +
3-run timeline
        +
Evidence cards
        +
Final verdict
```

The visual metaphor communicates the core discovery:

> Something invisible survived the first run and changed the second run.

The UI should reinforce the investigation rather than distract from the evidence.

---

# 🔐 Dependency Declaration

RealityCheck declares Node as a required tool and provides a Homebrew installation candidate:

```toml
schema_version = 1

[[tools]]
id = "node"
command = "node"
required = true

[[tools.install]]
manager = "brew"
package = "node"
```

Dependency preflight was verified successfully.

---

# 🛠️ Important Implementation Notes

### Persistent-state fixture

RealityCheck intentionally uses a persistent-state fixture for its demonstration.

That fixture allows the Play to prove the difference between:

```text
same workflow + clean state
```

and:

```text
same workflow + surviving state
```

The fixture is an implementation mechanism for demonstrating hidden state, not a separate feature exposed to the judge.

### Artifact comparison

The Play compares observable artifact content as part of its evidence model.

The demonstrated artifact is:

```text
artifact.txt
```

### Reset verification

The reset phase is important because a warm replay difference alone does not establish the cause.

The stronger signal is:

```text
CLEAN == RESET
```

while:

```text
CLEAN != WARM
```

That pattern is what produces the `STATE-DEPENDENT` verdict.

---

# ⚠️ Limitations

RealityCheck identifies **observable reproducibility differences** and evidence of relevant persistent state.

It does not claim to prove that every possible source of nondeterminism has been eliminated.

For example, external systems, genuinely changing inputs, network conditions, or nondeterministic dependencies may produce legitimate drift.

Therefore:

```text
STATE-DEPENDENT
```

means the controlled replay demonstrated state-dependent behavior.

```text
DRIFTING
```

means the observed executions differ without satisfying the implemented hidden-state pattern.

```text
REPRODUCIBLE
```

means the tested executions produced matching observable results under the tested conditions.

---

# 🧪 Release Verification

The final release candidate was validated and executed successfully.

Validation:

```text
Quality score: 0.88 (Pass)
OK: Play validation passed!
Signals evaluated: 7
```

Runtime:

```text
3/3 completed
0 failed
0 blocked
```

Release:

```text
status: released
readiness: ready
```

Registry publication:

```text
status: released
visibility: public
play_run_eligible: true
```

---

# 🚀 Quick Start

```bash
# Enter the Play
cd ~/.rote/flows/ajayrathod04/reality-check

# Check dependencies
rote deps check deps.toml

# Validate
rote play validate main.ts

# Run from clean state
rm -rf /tmp/realitycheck-state
rote play run main.ts
```

---

# 📌 Final Summary

RealityCheck turns reproducibility from a vague claim into a controlled investigation.

It asks:

```text
Can this workflow be trusted when run again?
```

Then it proves the answer through:

```text
CLEAN
  ↓
WARM REPLAY
  ↓
RESET
  ↓
COMPARE
  ↓
EVIDENCE
  ↓
VERDICT
```

The result is not simply:

```text
"Something changed."
```

It is:

```text
"Something changed,
here is the observable evidence,
here is the persistent state involved,
and here is what happened after reset."
```

**RealityCheck — replay it, investigate it, trust it.**

---

## Status

```text
🟢 Released
🟢 Public
🟢 Version 0.1.0
🟢 Registry published
🟢 3-run verification demonstrated
🟢 Hidden-state detection demonstrated
🟢 Reset verification demonstrated
🟢 GitHub repository available
```
