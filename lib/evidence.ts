import type { Snapshot } from "./reality.ts";

export function explain(a: Snapshot, b: Snapshot): string[] {
  const changes: string[] = [];
  const files = new Set([...Object.keys(a.files), ...Object.keys(b.files)]);

  for (const file of [...files].sort()) {
    const before = a.files[file];
    const after = b.files[file];

    if (before === undefined) {
      changes.push(`+ ${file} → created during replay`);
    } else if (after === undefined) {
      changes.push(`- ${file} → missing during replay`);
    } else if (before !== after) {
      changes.push(`Δ ${file} → content changed between clean and warm replay`);
    }
  }

  if (a.result !== b.result) {
    changes.push(`Δ RESULT → workflow output changed`);
  }

  return changes.length
    ? changes
    : ["✓ No observable result or artifact changes"];
}
