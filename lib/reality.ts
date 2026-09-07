import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type Snapshot = {
  result: string;
  files: Record<string, string>;
  hash: string;
};

function collectFiles(dir: string, root = dir): Record<string, string> {
  if (!existsSync(dir)) return {};
  const output: Record<string, string> = {};

  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const relative = path.slice(root.length + 1);

    if (statSync(path).isDirectory()) {
      Object.assign(output, collectFiles(path, root));
    } else {
      output[relative] = readFileSync(path, "utf8");
    }
  }

  return output;
}

export function snapshot(result: string, artifactDir: string): Snapshot {
  const files = collectFiles(artifactDir);
  const hash = createHash("sha256")
    .update(JSON.stringify({ result, files }))
    .digest("hex");

  return { result, files, hash };
}

export function compare(a: Snapshot, b: Snapshot): boolean {
  if (a.result !== b.result) return false;

  const aFiles = Object.keys(a.files).sort();
  const bFiles = Object.keys(b.files).sort();

  if (aFiles.length !== bFiles.length) return false;
  if (aFiles.some((file, i) => file !== bFiles[i])) return false;

  return aFiles.every((file) => a.files[file] === b.files[file]);
}
