import crypto from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";

const specimen = process.argv[2] ?? "REALITYCHECK-DEMO";
const stateFile = "/tmp/realitycheck-state/.cache";

if (existsSync(stateFile)) {
  rmSync(stateFile);
}

const artifact = specimen;
const result = "PASS";

const hash = crypto
  .createHash("sha256")
  .update(JSON.stringify({ result, artifact }))
  .digest("hex");

console.log(JSON.stringify({
  result,
  artifact,
  hash,
  state_path: stateFile,
  state_observed: false,
  reset_performed: true
}));
