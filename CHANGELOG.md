# Changelog

All notable changes to pickem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] — 2026-06-14

### Security

- **Fix terminal escape-sequence injection (CWE-150).** Item text — which is
  frequently attacker-controllable (git branch names, PR/issue titles, filenames,
  API results) — was rendered to the terminal without control-character
  sanitization. Only the active row stripped ANSI, and even that missed bare C0
  controls. An attacker-supplied label could emit OSC 52 clipboard writes (priming
  a paste-to-RCE), cursor-movement/erase sequences to spoof already-printed trusted
  UI, or BEL flooding. New `sanitizeDisplay()` strips every escape sequence (except
  inert SGR color) plus all C0/C1/DEL control bytes at the render boundary, applied
  to every externally-supplied display string across all prompts (`select`,
  `search`, `checkbox`, `searchable-checkbox`, `input`), `createFormatter`, row
  meta, and committed selection summaries. Display-only — returned values are
  unchanged. Reported independently by multiple security reviews.

## [1.0.6] — 2026-06-14

### Changed

- **Now open source.** Development moved to the public repository
  [calebogden/pickem-oss](https://github.com/calebogden/pickem-oss); the
  published package links it as the source and is built with npm provenance.
  Added README, CONTRIBUTING, and live Repository/Issues/Homepage links. No
  runtime code changes.

## [1.0.5] — 2026-06-14

### Fixed

- **Garbled menu in short terminals.** A picker frame (header + search box +
  list + footer) was rendered without regard for the terminal height. In a
  pane shorter than the frame, the terminal scrolled and the line-diff
  renderer's relative `cursorUp` saturated at the viewport top, so every
  repaint landed at a misaligned origin — producing duplicate rows, duplicate
  active chevrons, ghost lines below the footer, and an unreadable filter while
  typing. Page size is now clamped to the viewport height (`select`, `search`,
  `searchable-checkbox`, and `checkbox` prompts), so the list shows fewer rows
  instead of overflowing. No API change; behavior off a real TTY is unchanged.

## [1.0.0] — 2026-05-31

The picker engine is now fully native. The public API
(`pickem`, `pickem.from`, `pickem.checkbox`, `wizard`, `defineSource`) is
**unchanged and backward compatible** — existing callers need no changes. The
major bump reflects the engine replacement, the dependency removal, and the
refreshed prompt visuals.

### Changed

- **Native picker engine.** Replaced `@inquirer/prompts` and `@inquirer/core`
  with a built-in hook-based picker runtime (`createPicker`). The only
  remaining runtime dependency is `string-width`.
- Prompt visuals adopt the Claude Code selector aesthetic — a cyan `❯` cursor
  rail with truecolor accents and synchronized-output rendering.

### Added

- `src/core/*` — native engine: hook runtime, screen buffer, raw key reader,
  pagination, chrome/border rendering, theme tokens, color/accent helpers,
  glyphs, display-width measurement, ANSI primitives, status glyphs, and
  terminal cleanup.
- `src/prompts/*` — native implementations of select, input, confirm,
  checkbox, search, and searchable-checkbox.
- Release quality gates wired into `npm run release`: `npm audit` (prod deps),
  manifest audit (`scripts/audit.js`), `publint --strict`, `attw --pack`, and
  an `npm pack` dry-run.

### Removed

- Runtime dependencies `@inquirer/prompts` and `@inquirer/core`.
- Dev dependency `@inquirer/testing` — native prompts are now tested via the
  in-tree `renderTest` harness (`src/core/testing.ts`).

### Fixed

- `package.json` `exports` now lists the `types` condition first (export
  conditions are order-sensitive), so TypeScript resolves declarations
  correctly.

## [0.2.0] — 2026-05-09

### Added

- `pickem.checkbox(items, opts) → Promise<V[]>` — multi-select with built-in
  filter-as-you-type. Built on `@inquirer/core`. Space toggles, Enter submits,
  Backspace removes filter chars, Esc clears the filter. Pinned items respect
  the filter (stay pinned within filtered set). Checked items remain in the
  result even if the filter hides them. Result is in source order, matching
  `@inquirer/prompts/checkbox` semantics.
- `searchable?: boolean` option on both `pickem()` and `pickem.checkbox()`.
  Default `true`. When `false`, falls back to the non-search prompts
  (`@inquirer/prompts/select` and `/checkbox` respectively).
- `'checkbox'` step type for `wizard()`. `ctx[step.id]` receives `string[]`.
- `allowFreeText?: boolean` on `pickem.checkbox()`. When `true`, typing text
  that matches nothing and pressing Enter appends the typed text to the list
  as a checked item; the filter clears and the prompt stays open.
- `npm run demo` — interactive tour of every feature using `tsx`.
  Uses `MemoryStorage` so demo runs don't pollute `~/.pickem/usage.json`.
- New direct dep: `@inquirer/core ^10.3.2` (was already pulled transitively
  by `@inquirer/prompts`).
- New devDeps: `@inquirer/testing ^3.3.5` (custom prompt smoke-tests),
  `tsx ^4.21.0` (demo runner).
- Public type exports: `CheckboxOptions`, `CheckboxStep`.

### Changed

- **BREAKING**: default `badgeStyle` changed from `'bracket'` to `'none'`.
  Items with a `group` no longer render `[group]` badges by default. Pass
  `{ badgeStyle: 'bracket' }` or `{ badgeStyle: 'dot' }` to opt back in.
- `searchableCheckbox` toggle glyphs upgraded from `[ ]`/`[x]` to filled
  circles (`○`/`●`, green when checked) with a cyan `❯` cursor. Matches
  the Apple/iOS and `@inquirer/prompts` default visual style.
- `pickem()` single-select stats lookup no longer reaches into the tracker's
  private `cache` field — uses the public `getStats()` method instead.
  Fixes a latent issue when the tracker hadn't been loaded yet.
- `BadgeStyle` union now includes `'none'`.

### Internal

- Extracted `resolveTrackOptions` to `src/internal/track.ts` (shared between
  `pickem.ts` and `checkbox.ts`).
