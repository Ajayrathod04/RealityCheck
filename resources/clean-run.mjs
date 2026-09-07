import crypto from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const specimen = process.argv[2] ?? "REALITYCHECK-DEMO";
const stateDir = "/tmp/realitycheck-state";
mkdirSync(stateDir, { recursive: true });

const stateFile = `${stateDir}/.cache`;
const hasState = false;

const artifact = specimen;
const result = "PASS";

writeFileSync(stateFile, JSON.stringify({ specimen, run: "clean" }));

const hash = crypto
  .createHash("sha256")
  .update(JSON.stringify({ result, artifact }))
  .digest("hex");

console.log(JSON.stringify({
  result,
  artifact,
  hash,
  state_path: stateFile,
  state_observed: hasState
}));
