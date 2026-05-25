function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

export function extractFilePaths(diff: string): string[] {
  const paths: string[] = [];
  const regex = /^diff --git a\/.+ b\/(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(diff)) !== null) paths.push(m[1]);
  return paths;
}

export function extractSnippetForFile(diff: string, filePath: string): string | null {
  // Split on diff --git boundaries using lookahead so the marker is preserved
  const chunks = diff.split(/(?=^diff --git )/m);

  for (const chunk of chunks) {
    if (!chunk.startsWith('diff --git ')) continue;

    const firstLine = chunk.split('\n')[0];
    const bMatch = firstLine.match(/ b\/(.+)$/);
    if (!bMatch || bMatch[1] !== filePath) continue;

    // Find the first @@ hunk header
    const hhIdx = chunk.indexOf('\n@@');
    if (hhIdx === -1) continue;

    const hunkContent = chunk.slice(hhIdx + 1);
    const lines = hunkContent.split('\n');
    // Drop trailing empty line that split() produces
    if (lines[lines.length - 1] === '') lines.pop();

    if (lines.length <= 30) return lines.join('\n');
    return lines.slice(0, 30).join('\n') + '\n... truncated';
  }

  return null;
}

// Given a code-path: node ID, find which file in the diff corresponds to it
// by slugifying each diff file path and comparing against the node slug.
export function findFileForCodePath(diff: string, codePathId: string): string | null {
  const slug = codePathId.replace(/^code-path:/, '');
  for (const path of extractFilePaths(diff)) {
    if (slugify(path) === slug) return path;
  }
  return null;
}
