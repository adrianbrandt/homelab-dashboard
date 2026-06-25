import { describe, it, expect } from 'vitest';
import { readFileSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const srcDir = path.dirname(fileURLToPath(import.meta.url));

function definedTokens(): Set<string> {
  const css = readFileSync(path.join(srcDir, 'index.css'), 'utf8');
  const defs = css.match(/--[a-z0-9-]+(?=\s*:)/g) ?? [];
  return new Set(defs);
}

function referencedTokens(): Map<string, string[]> {
  // token name -> files that reference it
  const files = globSync(path.join(srcDir, '**/*.css'));
  const refs = new Map<string, string[]>();
  for (const file of files) {
    const css = readFileSync(file, 'utf8');
    for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
      const name = m[1];
      const arr = refs.get(name) ?? [];
      arr.push(path.relative(srcDir, file));
      refs.set(name, arr);
    }
  }
  return refs;
}

describe('theme token integrity', () => {
  it('every var(--x) referenced in CSS is defined in index.css', () => {
    const defined = definedTokens();
    const referenced = referencedTokens();
    const missing = [...referenced.keys()]
      .filter((t) => !defined.has(t))
      .map((t) => `${t} (used in ${referenced.get(t)!.join(', ')})`);
    expect(missing).toEqual([]);
  });
});
