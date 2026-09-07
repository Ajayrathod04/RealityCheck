import crypto from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const specimen = process.argv[2] ?? "REALITYCHECK-DEMO";
const stateFile = "/tmp/realitycheck-state/.cache";
const hasState = existsSync(stateFile);

const prior = hasState ? JSON.parse(readFileSync(stateFile, "utf8")) : null;

const artifact = hasState
  ? specimen + " + WARM_STATE"
  : specimen;

const result = "PASS";

writeFileSync(stateFile, JSON.stringify({ specimen, run: "warm", prior }));

const hash = crypto
  .createHash("sha256")
  .update(JSON.stringify({ result, artifact }))
  .digest("hex");

console.log(JSON.stringify({
  result,
  artifact,
  hash,
  state_path: stateFile,
  state_observed: hasState,
  prior_state: prior
}));
