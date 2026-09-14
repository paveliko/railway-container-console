/**
 * Build gate: every operation document must validate against the excerpt of
 * Railway's live schema in `openspec/_research/`, and the inlined copies in
 * `src/railway/documents.ts` must match the `.graphql` files beside them.
 *
 * A field Railway does not have fails the build here rather than at runtime,
 * as an HTTP 200 nobody reads. `verification.md` V-39.
 *
 * The excerpt is an *editorial* selection — the parts of the schema the console
 * touches, reproduced verbatim — so it names types it does not define. It is
 * research evidence and is not edited to suit a build step; instead the missing
 * names are stubbed as scalars here. That is enough to check field names,
 * argument names and variable types, which is what this gate is for.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSchema,
  parse,
  validate,
  visit,
  type DocumentNode,
} from 'graphql';
import * as documents from '../src/railway/documents';

const SCHEMA_PATH = 'openspec/_research/railway-schema-excerpt.graphql';
const OPERATIONS_DIR = 'src/railway/operations';

const BUILT_IN_TYPES = new Set(['String', 'Int', 'Float', 'Boolean', 'ID']);

function definedTypeNames(ast: DocumentNode): Set<string> {
  const names = new Set(BUILT_IN_TYPES);
  for (const definition of ast.definitions) {
    if ('name' in definition && definition.name) names.add(definition.name.value);
  }
  return names;
}

function referencedTypeNames(ast: DocumentNode): Set<string> {
  const names = new Set<string>();
  visit(ast, { NamedType: (node) => { names.add(node.name.value); } });
  return names;
}

/** The excerpt plus `scalar X` for every type it mentions but does not define. */
function buildExcerptSchema(source: string) {
  const ast = parse(source);
  const defined = definedTypeNames(ast);
  const missing = [...referencedTypeNames(ast)].filter((name) => !defined.has(name)).sort();
  const stubs = missing.map((name) => `scalar ${name}`).join('\n');
  return {
    schema: buildSchema(stubs ? `${stubs}\n\n${source}` : source),
    stubbed: missing,
  };
}

function normalise(source: string): string {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .join('\n');
}

export function check(): string[] {
  const { schema, stubbed } = buildExcerptSchema(readFileSync(SCHEMA_PATH, 'utf8'));
  const files = readdirSync(OPERATIONS_DIR).filter((f) => f.endsWith('.graphql'));
  const problems: string[] = [];
  if (files.length === 0) problems.push(`No operation documents in ${OPERATIONS_DIR}`);

  const inlined = new Set(
    Object.values(documents)
      .filter((value) => typeof value === 'string')
      .map((value) => normalise(String(value))),
  );

  for (const file of files) {
    const source = readFileSync(join(OPERATIONS_DIR, file), 'utf8');
    for (const error of validate(schema, parse(source))) {
      problems.push(`${file}: ${error.message}`);
    }
    if (!inlined.has(normalise(source))) {
      problems.push(
        `${file}: no matching export in src/railway/documents.ts — ` +
          'the file and the inlined copy have drifted apart',
      );
    }
  }

  if (problems.length === 0) {
    console.log(
      `Operation check passed: ${files.length} document(s) against ${SCHEMA_PATH} ` +
        `(${stubbed.length} type name(s) stubbed as scalars).`,
    );
  }
  return problems;
}

if (process.argv[1]?.endsWith('check-operations.ts')) {
  const problems = check();
  if (problems.length > 0) {
    console.error('Operation check failed:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
}
