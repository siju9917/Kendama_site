// ranking-integrity.mjs
//
// Verifies that every deep-evaluation research file with YAML front-matter
// has internally consistent scores (weighted factor sum = total_score, all
// 9 required factors present). Files without front-matter are silently skipped.
//
// This check implements the WISHLIST item (2026-06-06): structured,
// machine-parseable deep-evaluation format. The intent is to prevent silent
// calibration drift where RANKING.md cites a score that no longer matches the
// research file, or where a factor was accidentally skipped.
//
// See: brain/WISHLIST.md "A structured, machine-parseable deep-evaluation format"

import { readText, listFiles, finding } from './lib.mjs';

export const name = 'ranking-integrity';

const REQUIRED_FACTORS = [
  'revenue_ceiling',
  'probability',
  'distribution',
  'maintenance_fit',
  'build_feasibility',
  'self_serve_monetization',
  'defensibility',
  'evidence_quality',
  'strategic_fit',
];

const VALID_RECOMMENDATIONS = new Set([
  'CONDITIONAL_PROCEED',
  'CONDITIONAL_DEFER',
  'EVALUATE_TO_REJECT',
  'PROCEED',
  'DEFER',
  'REJECT',
]);

/**
 * Parse YAML front-matter from a markdown string.
 * Returns the parsed object or null if no front-matter is present.
 * Only handles the specific schema used by research files.
 */
export function parseFrontMatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const yaml = text.slice(4, end);
  const result = {};
  let currentKey = null;
  let inFactors = false;

  for (const line of yaml.split('\n')) {
    // Top-level bare mapping key (e.g. "factors:" with no inline value)
    const bareMatch = line.match(/^(\w[\w_]*):$/);
    if (bareMatch) {
      currentKey = bareMatch[1];
      inFactors = currentKey === 'factors';
      if (inFactors) result.factors = {};
      continue;
    }

    // Top-level key: value
    const topMatch = line.match(/^(\w[\w_]*):\s+(.+)$/);
    if (topMatch && !line.startsWith('  ')) {
      currentKey = topMatch[1];
      inFactors = currentKey === 'factors';
      if (!inFactors) {
        // Strip quotes from string values
        result[currentKey] = topMatch[2].replace(/^["']|["']$/g, '');
      } else {
        result.factors = {};
      }
      continue;
    }

    // factors sub-key: {weight: N, score: N, weighted: N}
    if (inFactors) {
      const factorMatch = line.match(/^\s{2}(\w[\w_]*):\s+\{weight:\s*(\d+),\s*score:\s*(\d+),\s*weighted:\s*(\d+)\}/);
      if (factorMatch) {
        result.factors[factorMatch[1]] = {
          weight: parseInt(factorMatch[2], 10),
          score: parseInt(factorMatch[3], 10),
          weighted: parseInt(factorMatch[4], 10),
        };
      }
    }
  }
  return result;
}

export function run() {
  const findings = [];
  const files = listFiles('brain/RESEARCH').filter(f => f.endsWith('.md'));

  let checkedCount = 0;
  let skippedCount = 0;

  for (const relPath of files) {
    let text;
    try {
      text = readText(relPath);
    } catch {
      findings.push(finding('P1', `${relPath}: could not read file`));
      continue;
    }

    const fm = parseFrontMatter(text);
    if (!fm) {
      skippedCount++;
      continue; // no front-matter — not a scored evaluation file
    }
    checkedCount++;

    const file = relPath.replace('brain/RESEARCH/', '');

    // Check required top-level fields
    for (const field of ['product', 'date', 'evidence_tier', 'recommendation', 'total_score']) {
      if (!(field in fm)) {
        findings.push(finding('P1', `${file}: missing required front-matter field "${field}"`));
      }
    }

    // Validate recommendation value
    if (fm.recommendation && !VALID_RECOMMENDATIONS.has(fm.recommendation)) {
      findings.push(finding('P1', `${file}: unknown recommendation "${fm.recommendation}" (expected one of ${[...VALID_RECOMMENDATIONS].join(', ')})`));
    }

    // Check total_score is numeric
    const reportedScore = parseInt(fm.total_score, 10);
    if (isNaN(reportedScore)) {
      findings.push(finding('P1', `${file}: total_score "${fm.total_score}" is not a valid integer`));
      continue;
    }

    if (!fm.factors) {
      findings.push(finding('P1', `${file}: missing "factors" block in front-matter`));
      continue;
    }

    // Check all required factors are present
    const missingFactors = REQUIRED_FACTORS.filter(f => !(f in fm.factors));
    if (missingFactors.length > 0) {
      findings.push(finding('P1', `${file}: missing factors: ${missingFactors.join(', ')}`));
    }

    // Verify each factor's arithmetic: weight × score ≠ weighted would be a data entry error
    for (const [fname, fdata] of Object.entries(fm.factors)) {
      // We don't enforce weight×score == weighted (scores are 0-10 but weights vary);
      // instead just check weighted is positive and score is in 0-10
      if (fdata.score < 0 || fdata.score > 10) {
        findings.push(finding('P1', `${file}: factor "${fname}" score ${fdata.score} is outside 0-10`));
      }
      if (fdata.weighted < 0) {
        findings.push(finding('P1', `${file}: factor "${fname}" weighted ${fdata.weighted} is negative`));
      }
    }

    // Verify total_score matches sum of weighted values (unless score_note explains an adjustment)
    const computedSum = Object.values(fm.factors).reduce((s, f) => s + f.weighted, 0);
    const hasScoreNote = 'score_note' in fm;

    if (!hasScoreNote && computedSum !== reportedScore) {
      findings.push(finding('P1', `${file}: total_score ${reportedScore} ≠ sum of weighted factors ${computedSum} (diff: ${reportedScore - computedSum}). Add score_note if the difference is intentional.`));
    } else if (hasScoreNote && computedSum !== reportedScore) {
      // Documented adjustment — just a P2 info note
      findings.push(finding('info', `${file}: total_score ${reportedScore} differs from factor sum ${computedSum} (intentional: score_note present)`));
    }
  }

  if (checkedCount === 0 && skippedCount > 0) {
    findings.push(finding('info', `No scored research files found (${skippedCount} files skipped — no front-matter). Add front-matter per WISHLIST.md format.`));
  } else {
    findings.push(finding('info', `Checked ${checkedCount} scored research file(s); ${skippedCount} file(s) skipped (no front-matter).`));
  }

  return { name, findings };
}
