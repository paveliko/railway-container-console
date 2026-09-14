#!/usr/bin/env node
/**
 * The specification corpus, checked.
 *
 * `CLAUDE.md` states seven rules and the registers state a dozen more in their
 * own header blocks — dense numbering, rejected alternatives, a successor for
 * every superseded decision. A rule that is written down and never re-derived
 * is a wish. This reads `openspec/` and fails on the ones a script can settle.
 *
 * Each rule below names the criterion it implements, so a failure points at a
 * line in `changes/spec-validation/verification.md` rather than at a regular
 * expression. The split between error and warning is the design: errors are
 * structural and referential, warnings are everything whose truth a script
 * cannot reach. `W-CLAIM` sees that a claim marker is absent; it can never see
 * that one is wrong, which is why it does not fail the build and why it does
 * not claim to implement `CLAUDE.md` rule 2.
 *
 * What this cannot see at all is listed in that change's `design.md` §7 —
 * notably rule 5, which is about a *change* to a file and needs a git base.
 *
 * `--self-test` runs the fixtures under `scripts/__fixtures__/specs/`, which
 * exist so that each rule is proved in both directions. A check whose red path
 * is untested is not a guarantee; a check whose green path is untested is a
 * parser that over-fires.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// ---------------------------------------------------------------------------
// Grammar. See `changes/spec-validation/design.md` §1.
//
// The number is `\d+` with an optional letter suffix, because `V-26a` is real.
// That one choice is why a template — `D-SEC-N`, `V-MW-N`, 33 of them — is not
// an identifier and needs no exemption list: the literal `N` is not a digit.
// ---------------------------------------------------------------------------

const CAPABILITIES = ['API', 'UI', 'SEC', 'OPS'];
const KINDS = ['unit', 'build', 'live', 'manual'];
const STATUSES = ['ratified', 'proposed', 'superseded', 'planned'];

const CAP = CAPABILITIES.join('|');
const V_ID = `V-(?:[A-Z]{2}-)?\\d+[a-z]?`;
const T_ID = `T-(?:[A-Z]{2}-)?\\d+(?:\\.\\d+)?`;
const QD_ID = `[QD]-(?:${CAP})-\\d+`;
const ANY_ID = `(?:${V_ID}|${T_ID}|${QD_ID})`;

/** A reference. The lookbehind is the entire scope of the example convention. */
const REFERENCE = new RegExp(`(?<!example:)\\b(${ANY_ID})\\b`, 'g');
const EXAMPLE = new RegExp(`\\bexample:(${ANY_ID})\\b`, 'g');
const ELLIPSIS = /\s*(?:…|\.\.\.)\s*/;

// ---------------------------------------------------------------------------
// Reading.
// ---------------------------------------------------------------------------

function markdownFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith('.')) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.md')) {
        const text = readFileSync(full, 'utf8');
        out.push({ path: full, rel: full.slice(root.length + 1), text, lines: text.split('\n') });
      }
    }
  };
  if (existsSync(root)) walk(root);
  return out;
}

/**
 * Blank-line separated blocks, fence-aware, each carrying its 1-based line.
 * A fenced block is returned whole so that a rule may look at it or skip it,
 * but it is never split on the blank lines inside it.
 */
function blocksOf(lines) {
  const blocks = [];
  let buf = [];
  let start = 0;
  let fenced = false;
  const flush = () => {
    if (buf.length) blocks.push({ line: start + 1, text: buf.join('\n'), lines: [...buf] });
    buf = [];
  };
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      if (!buf.length) start = i;
      buf.push(line);
      if (!fenced) flush();
      return;
    }
    if (!fenced && line.trim() === '') { flush(); return; }
    if (!buf.length) start = i;
    buf.push(line);
  });
  flush();
  return blocks;
}

/**
 * Markdown list items, with their continuation lines folded in.
 *
 * Without this a task written across several lines loses its `Acceptance:`
 * clause, and `R-TRACE` reports every criterion it claims as unclaimed.
 */
function listItems(lines) {
  const items = [];
  let current = null;
  let fenced = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced) { if (current) current.text += '\n' + line; return; }
    if (/^- /.test(line)) {
      if (current) items.push(current);
      current = { line: i + 1, text: line };
    } else if (current && /^\s+\S/.test(line)) {
      current.text += '\n' + line;
    } else if (current && line.trim() === '') {
      items.push(current);
      current = null;
    }
  });
  if (current) items.push(current);
  return items;
}

const idsIn = (text) => [...text.matchAll(REFERENCE)].map((m) => m[1]);

/** `V-CV-1 … V-CV-7` is seven criteria, not two. */
function expandAcceptance(segment) {
  const out = new Set();
  const cleaned = segment.replaceAll('`', '');
  const range = new RegExp(`(V-(?:[A-Z]{2}-)?)(\\d+)${ELLIPSIS.source}(?:V-(?:[A-Z]{2}-)?)?(\\d+)`, 'g');
  let rest = cleaned;
  for (const m of cleaned.matchAll(range)) {
    const [prefix, from, to] = [m[1], Number(m[2]), Number(m[3])];
    for (let n = from; n <= to; n += 1) out.add(`${prefix}${n}`);
    rest = rest.replace(m[0], ' ');
  }
  for (const id of idsIn(rest)) out.add(id);
  return out;
}

// ---------------------------------------------------------------------------
// Parsers. See design.md §2 — a canonical definition, an index entry, a group
// heading and a reference are four different things.
// ---------------------------------------------------------------------------

const RE = {
  criterion: new RegExp(`^- \\*{0,2}(${V_ID})\\*{0,2} (~~)?\`(\\w+)\``),
  taskCanonical: new RegExp(`^- \\[(.)\\] \\*\\*(${T_ID})\\b`),
  taskIndex: new RegExp(`^\\| (${T_ID})(?:\\s*[–—-]\\s*(${T_ID}))?\\s`),
  taskGroup: new RegExp(`^#{2,4} (${T_ID})\\b`),
  decision: new RegExp(`^\\| (D-(${CAP})-(\\d+)) \\|([^|]*)\\|(.*)\\|\\s*$`),
  questionRow: new RegExp(`^\\| (Q-(${CAP})-(\\d+)) \\|([^|]*)\\|([^|]*)\\|`),
  questionProse: new RegExp('^#{3,4} `?(Q-(' + CAP + ')-(\\d+))`?'),
  heading: /^(#{2,4}) (.*)$/,
  link: /\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/g,
};

function parseCorpus(root) {
  const files = markdownFiles(root);
  const byRel = new Map(files.map((f) => [f.rel, f]));

  const criteria = new Map();   // id -> {file, line, text, kind}
  const criterionDupes = [];
  const tasks = new Map();      // id -> {file, line, state, accepts:Set}
  const taskDupes = [];
  const taskIndex = new Map();  // id -> {file, line, where}
  const taskIndexDupes = [];
  const taskGroups = new Set();

  for (const f of files) {
    const isVerification = f.rel.endsWith('verification.md');
    const isTasks = f.rel.endsWith('tasks.md');

    if (isVerification) {
      for (const item of listItems(f.lines)) {
        const head = item.text.split('\n')[0];
        const m = RE.criterion.exec(head);
        if (!m) continue;
        const [, id, struck, kind] = m;
        if (criteria.has(id)) criterionDupes.push({ id, file: f.rel, line: item.line, first: criteria.get(id) });
        else criteria.set(id, {
          file: f.rel, line: item.line, text: item.text, kind,
          retired: Boolean(struck), change: f.rel.split('/')[1],
        });
      }
    }

    if (isTasks) {
      for (const item of listItems(f.lines)) {
        const m = RE.taskCanonical.exec(item.text.split('\n')[0]);
        if (!m) continue;
        const [, state, id] = m;
        const acc = /Acceptance:\s*([\s\S]*?)(?:\s*Verified by:|$)/.exec(item.text);
        const record = {
          file: f.rel, line: item.line, state,
          accepts: acc ? expandAcceptance(acc[1]) : new Set(),
          hasAcceptance: Boolean(acc),
        };
        if (tasks.has(id)) taskDupes.push({ id, file: f.rel, line: item.line, first: tasks.get(id) });
        else tasks.set(id, record);
      }
      f.lines.forEach((line, i) => {
        const g = RE.taskGroup.exec(line);
        if (g) taskGroups.add(g[1]);
        const x = RE.taskIndex.exec(line);
        if (!x) return;
        const cells = line.split('|').map((c) => c.trim());
        const where = cells[3] ?? '';
        const ids = [];
        if (x[2]) {
          const pre = x[1].replace(/\d+(?:\.\d+)?$/, '');
          const a = Number(x[1].slice(pre.length).split('.').pop());
          const b = Number(x[2].slice(pre.length).split('.').pop());
          const stem = x[1].slice(0, x[1].lastIndexOf('.') + 1);
          for (let n = a; n <= b; n += 1) ids.push(stem ? `${stem}${n}` : `${pre}${n}`);
        } else ids.push(x[1]);
        for (const id of ids) {
          if (taskIndex.has(id)) taskIndexDupes.push({ id, file: f.rel, line: i + 1 });
          else taskIndex.set(id, { file: f.rel, line: i + 1, where });
        }
      });
    }
  }

  // Registers.
  const decisions = [];
  const questions = [];
  const readRegister = (rel, kind) => {
    const f = byRel.get(rel);
    if (!f) return;
    let section = null;
    f.lines.forEach((line, i) => {
      const h = RE.heading.exec(line);
      if (h) section = { text: h[2], line: i + 1 };
      const prev = i > 0 ? f.lines[i - 1] : '';
      const contiguous = /^\s*\|/.test(prev);
      if (kind === 'D') {
        const m = RE.decision.exec(line);
        if (m) decisions.push({
          id: m[1], cap: m[2], n: Number(m[3]), status: m[4].trim(), statement: m[5],
          file: f.rel, line: i + 1, section, contiguous,
        });
      } else {
        const m = RE.questionRow.exec(line);
        if (m) questions.push({
          id: m[1], cap: m[2], n: Number(m[3]), priority: m[4].trim(), owner: m[5].trim(),
          file: f.rel, line: i + 1, section, contiguous, form: 'table',
        });
        const p = RE.questionProse.exec(line);
        if (p) questions.push({
          id: p[1], cap: p[2], n: Number(p[3]),
          file: f.rel, line: i + 1, section, contiguous: true, form: 'prose',
        });
      }
    });
  };
  readRegister('decisions.md', 'D');
  readRegister('open-questions.md', 'Q');

  // Change folders and the index that is supposed to list them.
  const changesDir = join(root, 'changes');
  const changeDirs = existsSync(changesDir)
    ? readdirSync(changesDir).filter((n) => !n.startsWith('.') && statSync(join(changesDir, n)).isDirectory()).sort()
    : [];
  const indexFile = byRel.get('changes/README.md');
  const indexed = indexFile
    ? [...indexFile.text.matchAll(/^\| \[`([a-z0-9-]+)\/`\]/gm)].map((m) => m[1])
    : null;
  const parent = indexFile
    ? /^\| \[`([a-z0-9-]+)\/`\][^|]*\|[^|]*\*\*parent\*\*/m.exec(indexFile.text)?.[1] ?? null
    : null;
  const legend = indexFile
    ? new Set([
        ...[...indexFile.text.matchAll(/`([A-Z]{2})` for/g)].map((m) => m[1]),
        ...[...indexFile.text.matchAll(/`[VT]-([A-Z]{2})-N`/g)].map((m) => m[1]),
      ])
    : null;

  return {
    root, files, byRel, criteria, criterionDupes, tasks, taskDupes,
    taskIndex, taskIndexDupes, taskGroups, decisions, questions,
    changeDirs, indexed, legend, parent,
  };
}

// ---------------------------------------------------------------------------
// Rules.
// ---------------------------------------------------------------------------

export function checkCorpus(root) {
  const c = parseCorpus(root);
  const problems = [];
  const add = (rule, severity, file, line, id, message) =>
    problems.push({ rule, severity, file, line, id, message });
  const err = (rule, file, line, id, message) => add(rule, 'error', file, line, id, message);
  const warn = (rule, file, line, id, message) => add(rule, 'warning', file, line, id, message);

  // -- R-STRUCT (V-SV-5) ----------------------------------------------------
  for (const dir of c.changeDirs) {
    for (const required of ['proposal.md', 'design.md', 'verification.md', 'tasks.md']) {
      if (!existsSync(join(root, 'changes', dir, required)))
        err('R-STRUCT', `changes/${dir}`, 0, dir, `${required} is missing`);
    }
  }
  if (c.indexed) {
    for (const dir of c.changeDirs)
      if (!c.indexed.includes(dir))
        err('R-STRUCT', 'changes/README.md', 0, dir, `the index does not list \`${dir}/\``);
    for (const named of c.indexed)
      if (!c.changeDirs.includes(named))
        err('R-STRUCT', 'changes/README.md', 0, named, `the index names \`${named}/\`, which is not a directory`);
  }
  for (const row of [...c.decisions, ...c.questions]) {
    if (row.form === 'prose') continue;
    if (!row.contiguous)
      err('R-STRUCT', row.file, row.line, row.id,
        'the row is separated from its table by a blank line, so it renders as literal text');
  }

  // -- R-ID (V-SV-6) --------------------------------------------------------
  const dense = (rows, label) => {
    for (const cap of CAPABILITIES) {
      const mine = rows.filter((r) => r.cap === cap);
      if (!mine.length) continue;
      const seen = new Map();
      for (const r of mine) {
        if (seen.has(r.n)) err('R-ID', r.file, r.line, r.id, `${r.id} is defined twice`);
        else seen.set(r.n, r);
      }
      const max = Math.max(...mine.map((r) => r.n));
      for (let n = 1; n <= max; n += 1)
        if (!seen.has(n))
          err('R-ID', label, 0, `${label.startsWith('d') ? 'D' : 'Q'}-${cap}-${n}`,
            `${cap} numbering is not dense: ${n} is missing below ${max}`);
    }
  };
  dense(c.decisions, 'decisions.md');
  dense(c.questions, 'open-questions.md');

  for (const d of c.criterionDupes)
    err('R-ID', d.file, d.line, d.id, `${d.id} is defined again; first at ${d.first.file}:${d.first.line}`);
  for (const d of c.taskDupes)
    err('R-ID', d.file, d.line, d.id,
      `${d.id} has a second canonical definition; the first is at ${d.first.file}:${d.first.line}`);
  for (const d of c.taskIndexDupes)
    err('R-ID', d.file, d.line, d.id, `${d.id} has a second index entry`);

  for (const [id, meta] of c.criteria) {
    const code = /^V-([A-Z]{2})-/.exec(id)?.[1];
    if (code && c.legend && c.legend.size && !c.legend.has(code))
      err('R-ID', meta.file, meta.line, id, `child code \`${code}\` is not in the legend in changes/README.md`);
    if (!code && c.parent && meta.change && meta.change !== c.parent)
      err('R-ID', meta.file, meta.line, id,
        `a plain \`${id}\` is the parent change's form; defined here it is ambiguous`);
  }

  // -- R-REF (V-SV-7) -------------------------------------------------------
  const defined = new Set([
    ...c.criteria.keys(), ...c.tasks.keys(), ...c.taskIndex.keys(), ...c.taskGroups,
    ...c.decisions.map((d) => d.id), ...c.questions.map((q) => q.id),
  ]);
  const resolves = (id) => {
    if (defined.has(id)) return true;
    // `T-1` resolves when any `T-1.<m>` does.
    if (/^T-(?:[A-Z]{2}-)?\d+$/.test(id))
      return [...defined].some((d) => d.startsWith(`${id}.`));
    return false;
  };

  let examplesSkipped = 0;
  for (const f of c.files) {
    f.lines.forEach((line, i) => {
      for (const m of line.matchAll(EXAMPLE)) {
        examplesSkipped += 1;
        if (resolves(m[1]))
          warn('W-EXAMPLE', f.rel, i + 1, m[1],
            `marked \`example:\` but ${m[1]} exists, so the marker silences a real reference`);
      }
      for (const id of idsIn(line))
        if (!resolves(id)) err('R-REF', f.rel, i + 1, id, `${id} resolves to nothing`);
    });
  }

  for (const [id, entry] of c.taskIndex) {
    const staysHere = /stays here/i.test(entry.where);
    if (staysHere) {
      const canonical = c.tasks.get(id);
      if (!canonical || canonical.file !== entry.file)
        err('R-REF', entry.file, entry.line, id,
          `the delegation says "stays here" but ${id} has no canonical definition in this file`);
      continue;
    }
    if (!entry.where.trim() || entry.where.trim() === '—') continue;
    const names = idsIn(entry.where).some((r) => resolves(r));
    const base = dirname(join(root, entry.file));
    const path = [...entry.where.matchAll(/`?((?:\.\.?\/)*[\w.-]+\/)`?/g)]
      .some((m) => existsSync(resolve(base, m[1])) || existsSync(resolve(root, m[1])));
    if (!names && !path)
      err('R-REF', entry.file, entry.line, id,
        `the delegation cell names no task or change folder that exists`);
  }

  // -- R-TRACE (V-SV-8) -----------------------------------------------------
  const citedBy = new Map([...c.criteria.keys()].map((id) => [id, new Set()]));
  for (const [id, meta] of c.criteria) {
    const head = meta.text.split('\n')[0];
    const body = meta.text.slice(head.indexOf(id) + id.length);
    for (const ref of idsIn(body))
      if (c.criteria.has(ref) && ref !== id) citedBy.get(ref).add(id);
  }
  const reached = new Set();
  for (const [, t] of c.tasks)
    if (t.hasAcceptance) for (const id of t.accepts) if (c.criteria.has(id)) reached.add(id);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [id, cites] of citedBy) {
      if (reached.has(id)) continue;
      for (const y of cites) if (reached.has(y)) { reached.add(id); grew = true; break; }
    }
  }
  const inCycle = (start) => {
    const seen = new Set();
    const stack = [...citedBy.get(start)];
    while (stack.length) {
      const n = stack.pop();
      if (n === start) return true;
      if (seen.has(n) || reached.has(n)) continue;
      seen.add(n);
      stack.push(...(citedBy.get(n) ?? []));
    }
    return false;
  };
  for (const [id, meta] of c.criteria) {
    if (reached.has(id)) continue;
    if (meta.retired) {
      const replacements = idsIn(meta.text).filter((x) => /^V-/.test(x) && x !== id && c.criteria.has(x));
      if (!replacements.length)
        err('R-ID', meta.file, meta.line, id,
          'is struck through but names no replacement criterion that exists');
      continue;
    }
    const cyclic = inCycle(id);
    err('R-TRACE', meta.file, meta.line, id, cyclic
      ? `${id} and the criteria citing it form a cycle that reaches no task`
      : `${id} is defined but no task's Acceptance: reaches it`);
  }

  // -- R-LINK (V-SV-9) ------------------------------------------------------
  for (const f of c.files) {
    f.lines.forEach((line, i) => {
      for (const m of line.matchAll(RE.link)) {
        const target = m[1];
        if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
        const path = decodeURIComponent(target.split('#')[0]);
        if (!path) continue;
        if (!existsSync(resolve(dirname(f.path), path)))
          err('R-LINK', f.rel, i + 1, null, `the link target \`${target}\` does not exist`);
      }
    });
  }

  // -- R-VOCAB (V-SV-10) ----------------------------------------------------
  for (const f of c.files) {
    if (f.rel.endsWith('tasks.md')) {
      f.lines.forEach((line, i) => {
        const m = /^- \[(.)\] \*\*T-/.exec(line);
        if (m && !['x', ' ', '~'].includes(m[1]))
          err('R-VOCAB', f.rel, i + 1, null, `\`[${m[1]}]\` is not a checkbox state; use [x], [ ] or [~]`);
      });
    }
    for (const m of f.text.matchAll(/\*\*Amended by `([a-z0-9-]+)`/g))
      if (!c.changeDirs.includes(m[1]))
        err('R-VOCAB', f.rel, 0, null, `\`Amended by \\\`${m[1]}\\\`\` names no change folder`);
  }
  for (const [id, meta] of c.criteria)
    if (!KINDS.includes(meta.kind))
      err('R-VOCAB', meta.file, meta.line, id, `\`${meta.kind}\` is not a criterion kind`);
  for (const d of c.decisions) {
    const keyword = d.status.replace(/\*/g, '').trim().split(/[\s,;—-]/)[0].toLowerCase();
    if (!STATUSES.includes(keyword))
      err('R-VOCAB', d.file, d.line, d.id, `status begins \`${keyword}\`, which is not a decision status`);
    if (keyword === 'superseded') {
      const successor = idsIn(d.status).find((x) => /^D-/.test(x) && x !== d.id);
      if (!successor) err('R-ID', d.file, d.line, d.id, 'superseded but names no successor');
      else if (!c.decisions.some((x) => x.id === successor))
        err('R-ID', d.file, d.line, d.id, `names the successor ${successor}, which is not defined`);
    }
    if (keyword !== 'planned' && !/\*\*Rejected:\*\*|\*\*Alternatives/.test(d.statement))
      err('R-ID', d.file, d.line, d.id, 'records no rejected alternatives, so it is a note, not a decision');
  }

  // -- W-FILE (V-SV-13) -----------------------------------------------------
  for (const row of [...c.decisions, ...c.questions]) {
    if (!row.section) continue;
    const declared = new RegExp(`[QD]-(${CAP})-N`).exec(row.section.text)?.[1];
    if (declared && declared !== row.cap)
      warn('W-FILE', row.file, row.line, row.id,
        `filed under \`${row.section.text}\`, which declares ${declared}`);
  }

  // -- W-CRED (V-SV-12) -----------------------------------------------------
  const SLOT = /(RAILWAY_(?!TOKEN_KIND\b)[A-Z_]*(?:TOKEN|KEY|SECRET)[A-Z_]*\s*=|Authorization:\s*Bearer\s|Project-Access-Token:\s)\s*([A-Za-z0-9._-]{20,})/g;
  for (const f of c.files) {
    f.lines.forEach((line, i) => {
      for (const m of line.matchAll(SLOT))
        warn('W-CRED', f.rel, i + 1, null,
          `the credential slot \`${m[1].trim()}\` is followed by a literal value`);
    });
  }

  // -- W-CLAIM (V-SV-11) ----------------------------------------------------
  const MARKER = /`?\[(observed|inferred|to-verify)\b[^\]]*\]/;
  for (const f of c.files) {
    if (!f.rel.startsWith('_research/')) continue;
    let armed = false;
    let sinceHeading = 0;
    for (const block of blocksOf(f.lines)) {
      const first = block.lines[0];
      if (/^#{1,6} /.test(first)) { armed = false; sinceHeading = 0; continue; }
      const structural = /^\s*(```|[|>\-*+]|\d+\.|<!--|!\[)/.test(first);
      if (structural) { if (MARKER.test(block.text)) armed = true; continue; }
      sinceHeading += 1;
      if (MARKER.test(block.text)) { armed = true; continue; }
      if (!armed && sinceHeading > 1)
        warn('W-CLAIM', f.rel, block.line, null,
          'opens a claim without [observed], [inferred] or [to-verify]');
    }
  }

  return { problems, stats: {
    documents: c.files.length,
    criteria: c.criteria.size,
    tasks: c.tasks.size,
    decisions: c.decisions.length,
    questions: c.questions.length,
    examplesSkipped,
  } };
}

// ---------------------------------------------------------------------------

const render = (p) =>
  `${p.rule} — ${p.file}${p.line ? `:${p.line}` : ''}${p.id ? ` — ${p.id}` : ''}: ${p.message}`;

if (process.argv.includes('--self-test')) {
  const dir = join(ROOT, 'scripts/__fixtures__/specs');
  const names = existsSync(dir) ? readdirSync(dir).filter((n) => !n.startsWith('.')).sort() : [];
  let failures = 0;
  for (const name of names) {
    const expected = JSON.parse(readFileSync(join(dir, name, 'expect.json'), 'utf8')).problems;
    let got = [];
    try { got = checkCorpus(join(dir, name)).problems; }
    catch (error) { got = [{ rule: 'parse', severity: 'error', file: name, message: error.message }]; }
    const key = (p) => `${p.rule}${p.id ? ` ${p.id}` : ''}`;
    const missing = expected.filter((e) => !got.some((g) => g.rule === e.rule && (!e.id || g.id === e.id)));
    const extra = got.filter((g) => !expected.some((e) => e.rule === g.rule && (!e.id || g.id === e.id)));
    if (!missing.length && !extra.length) {
      console.log(`  ok   ${name}${expected.length ? ` — ${expected.map(key).join(', ')}` : ' — clean'}`);
    } else {
      failures += 1;
      console.error(`  FAIL ${name}`);
      for (const m of missing) console.error(`         expected but absent: ${key(m)}`);
      for (const x of extra) console.error(`         unexpected: ${render(x)}`);
    }
  }
  if (failures) { console.error(`Self-test failed: ${failures} of ${names.length} fixture(s).`); process.exit(1); }
  console.log(`Self-test passed: ${names.length} fixture(s), red and green.`);
} else {
  const { problems, stats } = checkCorpus(join(ROOT, 'openspec'));
  const errors = problems.filter((p) => p.severity === 'error');
  const warnings = problems.filter((p) => p.severity === 'warning');
  if (warnings.length) {
    console.warn(`Spec check — ${warnings.length} warning(s):`);
    for (const w of warnings) console.warn(`  · ${render(w)}`);
  }
  if (errors.length) {
    console.error(`Spec check failed — ${errors.length} error(s):`);
    for (const e of errors) console.error(`  - ${render(e)}`);
    process.exit(1);
  }
  console.log(
    `Spec check passed: ${stats.documents} documents, ${stats.criteria} criteria, ` +
    `${stats.tasks} tasks, ${stats.decisions} decisions, ${stats.questions} questions, ` +
    `${warnings.length} warning(s), ${stats.examplesSkipped} example reference(s) skipped.`,
  );
}
