/**
 * RealityCheck
 *
 * Tests whether a workflow remains reproducible across clean, warm, and reset runs.
 *
 * @rote-frontmatter
 * ---
 * name: reality-check
 * version: 0.1.0
 * description: Verifies workflow reproducibility across clean, warm, and reset runs and exposes hidden state with concrete evidence.
 * source: https://github.com/wemakedevs/rote
 * provenance:
 *   author: Hackathon team
 * metadata:
 *   rote_version: 0.80.0
 *   version: 0.1.0
 *   status: released
 *   kind: atomic
 *   flow_type: sequential
 *   execution_model: steps_with_presentation
 *   format: typescript
 *   requires_endpoints: []
 *   requires_sessions: false
 *   contract:
 *     atomic: true
 *     input:
 *       type: none
 *     output:
 *       format: json
 *       destination: stdout
 *     composable: true
 *     writes:
 *     - path: /tmp/realitycheck-state/.cache
 *       reason: Controlled persistent-state fixture used to detect hidden state during warm replay and remove it during reset.
 *   discoverability:
 *     tags:
 *     - reproducibility
 *     - testing
 *     - hidden-state
 *     - workflow
 * parameters:
 * - name: specimen
 *   param_type: string
 *   required: false
 *   default: REALITYCHECK-DEMO
 *   description: Controlled workflow specimen used for clean, warm, and reset reproducibility checks.
 * steps:
 *   clean_run:
 *     type: process.exec
 *     argv:
 *     - node
 *     - '@resource{clean-run.mjs}'
 *     - $specimen
 *   warm_replay:
 *     type: process.exec
 *     depends_on:
 *     - clean_run
 *     argv:
 *     - node
 *     - '@resource{warm-run.mjs}'
 *     - $specimen
 *   reset_run:
 *     type: process.exec
 *     depends_on:
 *     - warm_replay
 *     argv:
 *     - node
 *     - '@resource{reset-run.mjs}'
 *     - $specimen
 * presentation_fixtures:
 *   clean_run: resources/presentation-fixtures/clean_run/fixture.yaml
 *   warm_replay: resources/presentation-fixtures/warm_replay/fixture.yaml
 *   reset_run: resources/presentation-fixtures/reset_run/fixture.yaml
 * ---
 */

const { FlowOutput, stepName } = await import("__ROTE_PRESENTATION_SDK__");
const out = new FlowOutput();

const { compare } = await import("./lib/reality.ts");
const { explain } = await import("./lib/evidence.ts");



const {
  isProcessExecBody,
  loadPresentationContext,
} = await import("__ROTE_PRESENTATION_SDK__");

const ctx = await loadPresentationContext();

function readProcessText(step: ReturnType<typeof ctx.requireAvailable>, name: string): string {
  if (!isProcessExecBody(step.body)) {
    throw new Error(`${name} did not record a process.exec observation`);
  }

  if (
    step.body.status.exit.kind !== "code" ||
    step.body.status.exit.code !== 0
  ) {
    throw new Error(
      `${name} failed: ${step.body.stderr?.text ?? "no stderr captured"}`,
    );
  }

  return step.body.stdout?.text ?? "";
}

const cleanStep = ctx.requireAvailable(stepName("clean_run"));
const warmStep = ctx.requireAvailable(stepName("warm_replay"));
const resetStep = ctx.requireAvailable(stepName("reset_run"));

const clean = JSON.parse(readProcessText(cleanStep, "clean_run"));
const warm = JSON.parse(readProcessText(warmStep, "warm_replay"));
const reset = JSON.parse(readProcessText(resetStep, "reset_run"));

const cleanSnapshot = {
  result: clean.result,
  files: { "artifact.txt": clean.artifact },
  hash: clean.hash,
};

const warmSnapshot = {
  result: warm.result,
  files: { "artifact.txt": warm.artifact },
  hash: warm.hash,
};

const resetSnapshot = {
  result: reset.result,
  files: { "artifact.txt": reset.artifact },
  hash: reset.hash,
};

const cleanWarmMatch = compare(cleanSnapshot, warmSnapshot);
const cleanResetMatch = compare(cleanSnapshot, resetSnapshot);

const stateObserved = Boolean(warm.state_observed);
const resetPerformed = Boolean(reset.reset_performed);

const evidence = [
  ...explain(cleanSnapshot, warmSnapshot),
  ...(stateObserved
    ? [`👻 Hidden state observed at ${warm.state_path}`]
    : []),
  ...(resetPerformed
    ? [`✓ Reset removed persistent state before verification`]
    : []),
];

const verdict =
  !cleanWarmMatch && cleanResetMatch
    ? "STATE-DEPENDENT"
    : !cleanWarmMatch || !cleanResetMatch
      ? "DRIFTING"
      : "REPRODUCIBLE";

const humanOutput = `
+======================================================================+
| REALITYCHECK                                                         |
| Can this workflow be trusted when run again?                         |
+======================================================================+
|                                                                      |
|  RUN          STATUS        HASH                                     |
|  ------------------------------------------------------------------  |
|  CLEAN        [OK] PASS    ${clean.hash.slice(0,12).padEnd(12)}                         |
|  WARM REPLAY  ${cleanWarmMatch ? "[OK] MATCH   " : "[!!] CHANGED"} ${warm.hash.slice(0,12).padEnd(12)}                         |
|  RESET        ${cleanResetMatch ? "[OK] PASS    " : "[!!] DRIFT   "} ${reset.hash.slice(0,12).padEnd(12)}                         |
|                                                                      |
+======================================================================+
| RESULT                                                               |
|                                                                      |
|  ${verdict === "STATE-DEPENDENT" ? "HIDDEN STATE DETECTED" : verdict}                                             |
|                                                                      |
| WHY                                                                  |
|  ${!cleanWarmMatch ? evidence[0] : "All executions produced the same observable output."}             |
|                                                                      |
+----------------------------------------------------------------------+
| EVIDENCE                                                             |
|                                                                      |
|  STATE / ARTIFACT EVIDENCE                                          |
|  PATH   -> ${warm.state_path ?? "/tmp/realitycheck-state/.cache"}   |
|  CLEAN  -> ${clean.artifact}                                         |
|  WARM   -> ${warm.artifact}                                          |
|  RESET  -> ${reset.artifact}                                         |
|  OBSERVED -> ${stateObserved ? "YES — prior state detected" : "NO"} |
|  RESET    -> ${resetPerformed ? "YES — state removed" : "NO"}       |
|                                                                      |
+----------------------------------------------------------------------+
| VERDICT                                                              |
|                                                                      |
|  ${verdict}                                                          |
|                                                                      |
|  ${verdict === "STATE-DEPENDENT"
    ? "Recommendation: declare or remove persistent state."
    : "Recommendation: workflow is reproducible."}                    |
|                                                                      |
+======================================================================+
`;

out.human("```text\n" + humanOutput.trimEnd() + "\n```");

out.summary(
  `RealityCheck: ${verdict}; clean=${clean.hash.slice(0,12)}; ` +
  `warm=${warm.hash.slice(0,12)}; reset=${reset.hash.slice(0,12)}`
);

out.result({
  verdict,
  clean_hash: clean.hash,
  warm_hash: warm.hash,
  reset_hash: reset.hash,
  clean_warm_match: cleanWarmMatch,
  clean_reset_match: cleanResetMatch,
  state_observed: stateObserved,
  reset_performed: resetPerformed,
  state_path: warm.state_path,
  evidence,
});
