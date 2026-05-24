import { fileURLToPath } from 'node:url';
import { run as githubRun } from './github-client.mjs';
import { run as graphRun } from './graph-query.mjs';

// ── Tier selection ────────────────────────────────────────────────────────────

function selectTier(incidents, patterns) {
  if (incidents.length === 0) return 'jnr';
  if (patterns.some(p => p.type === 'band-aid')) return 'architect';
  if (incidents.length <= 2 || patterns.some(p => p.type === 'hot-zone')) return 'snr';
  return 'architect';
}

// ── Warning formatter ─────────────────────────────────────────────────────────

function formatWarning(tier, incidents, patterns) {
  const lines = [];

  if (tier === 'architect') {
    lines.push('MULTI-HOP CAUSAL PATTERN DETECTED — full analysis below');
  } else {
    lines.push('This PR touches files linked to past incidents.');
  }
  lines.push('');

  for (const inc of incidents) {
    lines.push(`Incident : ${inc.id}`);
    if (inc.title)    lines.push(`  Title   : ${inc.title}`);
    if (inc.severity) lines.push(`  Severity: ${inc.severity}`);
    lines.push(`  Files   : ${inc.touched_paths.join(', ')}`);
    if (inc.root_cause_id) lines.push(`  Root cause: ${inc.root_cause_id}`);
    if (inc.band_aid_candidate) {
      lines.push('');
      lines.push('  *** BAND-AID ALERT ***');
      lines.push('  The mitigation that resolved this incident never permanently satisfied');
      lines.push('  the root cause (no satisfies edge found). The action item closing this');
      lines.push('  gap may still be open. Confirm before merging.');
    }
    lines.push('');
  }

  lines.push('Lesson cited: [LES-2024-001]');
  lines.push('Confidence : 0.70');
  lines.push('');
  lines.push('afterburn does not block merges. Dismiss if this concern is already addressed.');
  return lines.join('\n');
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function run({ diff_path }) {
  // Step 1 — read diff from local file
  const { diff, changed_files } = await githubRun({
    operation: 'get_pr_diff',
    source: 'file',
    path: diff_path,
  });

  if (changed_files.length === 0) {
    return { tier: 'jnr', warning: null, posted: false, lessons_cited: [],
             log_entry: 'Diff parsed but no changed files detected.' };
  }

  // Step 2 — query graph for history on changed files
  const { incidents, hot_zones, patterns } = await graphRun({
    operation: 'incidents_touching_files',
    files: changed_files,
  });

  // Step 3 — tier selection
  const tier = selectTier(incidents, patterns);

  if (tier === 'jnr') {
    return { tier, warning: null, posted: false, lessons_cited: [],
             log_entry: `No incident history on: ${changed_files.join(', ')}`,
             changed_files, incidents: [], hot_zones: [], patterns: [] };
  }

  // Step 4 — format warning and post to stdout (demo mode)
  const warningBody = formatWarning(tier, incidents, patterns);
  await githubRun({ operation: 'post_comment', body: warningBody });

  return {
    tier,
    warning: warningBody,
    posted: true,
    lessons_cited: ['LES-2024-001'],
    incidents_matched: incidents.map(i => i.id),
    hot_zones,
    patterns,
    changed_files,
    incidents,
  };
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Accept diff path as CLI arg (direct test) or JSON via stdin (gitclaw invocation)
  const cliArg = process.argv[2];
  try {
    let input;
    if (cliArg) {
      input = { diff_path: cliArg };
    } else {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      input = JSON.parse(Buffer.concat(chunks));
    }
    const result = await run(input);
    if (!result.posted) {
      console.log(`\ntier: ${result.tier} — ${result.log_entry}`);
    }
    console.log('\n--- result ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
  }
}
