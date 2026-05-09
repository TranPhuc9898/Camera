---
name: u-review-skill
description: 'Audit an existing u-* SKILL.md against the unicorn skill template — frontmatter, structure, drift, RN-stack accuracy. Triggers — review skill, audit skill, validate skill, skill quality, skill drift, lint skill, skill consistency.'
---

# u-review-skill — Audit a Skill File

## TL;DR

- Run on a single SKILL.md path. Output: PASS / NEEDS FIXES / BLOCKED report
- Checks: frontmatter validity, structure conformance, stack-accuracy (no Flutter terms), trigger coverage, length, cross-links exist
- Auto-fixable items flagged with proposed edit; structural drift flagged for human decision
- Use after `u-create-skill` and before merging skill changes

## When to load

Auditing a new skill before commit, sweeping `.claude/skills/` for drift, after porting from another project.

---

## Audit checklist

### 1. Frontmatter

```
---
name: u-<kebab>           ← matches folder name
description: "...Triggers — keyword1, keyword2, ..."
---
```

| Check                               | Pass criteria                                        |
| ----------------------------------- | ---------------------------------------------------- |
| `name` matches folder               | `.claude/skills/u-foo/` ↔ `name: u-foo`              |
| `description` non-empty             | ≥ 60 chars                                           |
| `Triggers —` present                | Sentence with `Triggers —` and ≥ 6 keywords          |
| Keywords lowercase, comma-separated | No semicolons, no proper nouns of internal codenames |

### 2. Structure

Must contain (in this order):

- `# u-<name> — Title` (h1)
- `## TL;DR` (4–8 bullets, concrete)
- `## When to load` (paragraph)
- ≥ 1 main concept section (h2)
- `## Do / Don't` table (✅ / ❌)
- `## See also` (links to ≥ 1 related skill)

Optional but recommended: `## Common pitfalls`, decision matrix.

### 3. Stack accuracy (RN-only — flag Flutter remnants)

Banned terms (CASE-SENSITIVE grep — fail if any non-comment match):

```
fvm | dart | melos | mason | build_runner | gen-l10n | Dio | DioException
| MobX | obs() | ObsBuilder | Hive | LsKeys | GoRouter | BaseController
| context.l10n | FirebaseAnalytics | Marionette | Widgetbook | Flutter
| pubspec | .dart | pub get | flutter run
```

If any are present (outside an explicit "do NOT use" section): NEEDS FIXES.

### 4. Length

| Skill kind                           | Soft cap  |
| ------------------------------------ | --------- |
| Concept skill (one topic)            | 300 lines |
| Pattern skill (multiple patterns)    | 400 lines |
| Orchestrator (`u-task`, `u-fix-bug`) | 600 lines |

Over the cap → recommend split, not auto-fail.

### 5. Trigger coverage

Read the description's `Triggers —` list. For each keyword:

- It should be a phrase a USER would type (not internal jargon)
- Synonyms covered (e.g. "e2e" + "end to end")
- Actions tense matches the skill's mood (verbs for action skills, nouns for concept skills)

### 6. Cross-links

Every `See also` reference must exist:

```bash
ls .claude/skills/u-<referenced>/SKILL.md
```

Broken link → NEEDS FIXES.

### 7. Style

- No emojis (unless explicitly requested by user)
- No banned words: `delve`, `crucial`, `robust`, `comprehensive`, `leverage`, `utilize`, `nuanced`, `multifaceted`, `furthermore`, `moreover`, `pivotal`, `streamline`, `Foster`
- Code blocks have language tag (` ```ts ` not ` ``` `)
- Tables use the standard pipe format

---

## Audit report format

```
━━━ SKILL REVIEW ━━━━━━━━━━━━━━━━━━━━━━━━
Path: .claude/skills/u-foo/SKILL.md  (240 lines)

🔴 Critical
  · Line 1 — Frontmatter missing `Triggers —` keyword list

🟠 High
  · Line 87 — References Flutter term "MobX observable"
  · Section "## See also" — link `u-zustand` not found

🟡 Medium
  · Line 23 — TL;DR has 12 bullets (recommend ≤8)
  · Section "## Common pitfalls" missing (recommended)

⚪ Nit
  · Line 145 — Banned word "robust" — replace with concrete adjective

━━━ 5 findings · NEEDS FIXES ━━━━━━━━━━━━
```

Verdict:

- **PASS** — 0 🔴 + 0 🟠
- **NEEDS FIXES** — 0 🔴 + ≥1 🟠 or 🟡
- **BLOCKED** — ≥1 🔴

---

## Audit workflow

```
1. Read .claude/skills/u-<name>/SKILL.md
2. Parse frontmatter (yaml block at top)
3. Run grep for banned terms (Flutter remnants, banned words)
4. Walk h2 sections, check structure compliance
5. Resolve every "See also" link
6. Check trigger coverage (≥6 keywords, lowercase, in Triggers — sentence)
7. Count lines vs cap
8. Render report
```

For batch audit:

```bash
for d in .claude/skills/u-*; do
  echo "=== $d ==="
  # run the audit on each
done
```

---

## Auto-fixable items

| Finding                                 | Auto-fix                           |
| --------------------------------------- | ---------------------------------- |
| Banned word                             | Replace with proposed neutral term |
| Missing language tag on code block      | Add `ts` / `bash` / `tsx`          |
| Trailing whitespace                     | Strip                              |
| Missing newline at EOF                  | Add                                |
| Frontmatter `name` mismatch with folder | Update name to match folder        |

NOT auto-fixable (human decision):

- Missing sections
- Flutter-term references that need rewrite
- Cross-link points to non-existent skill
- Length over cap (split or condense?)

---

## Common findings

- **Flutter remnants** — most common after porting. Sweep with `grep -E 'fvm|MobX|Hive|GoRouter|Dio'`.
- **Triggers too narrow** — only 3-4 keywords. Expand with synonyms.
- **TL;DR is prose, not bullets** — convert to bullet list.
- **Decision matrix missing** — for any skill that's "when to use X vs Y", a table is mandatory.
- **No code example** — at least one ts/tsx block per pattern skill.

---

## Do / Don't

| ✅                                     | ❌                              |
| -------------------------------------- | ------------------------------- |
| Read whole file before reporting       | Skim, miss structural drift     |
| Group findings by severity             | Linear list of unrelated points |
| Cite line numbers                      | "Somewhere in TL;DR"            |
| Distinguish auto-fixable vs structural | Treat all as auto-fix           |
| Recommend, don't blindly rewrite       | Auto-edit without confirmation  |

---

## See also

- `u-create-skill` — the template this audits against
- `u-doc` — broader documentation patterns
- `u-finalize` — pre-commit audit at code level
- `u-architecture` — terms the skill must align with
