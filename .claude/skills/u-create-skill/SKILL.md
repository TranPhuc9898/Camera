---
name: u-create-skill
description: 'Create a new u-* SKILL.md following the unicorn skill style. Frontmatter, triggers, structure, naming. Triggers — create skill, new skill, write skill, skill template, skill file, SKILL.md, frontmatter, skill triggers.'
---

# u-create-skill — Author a New Skill

## TL;DR

- Skills live at `.claude/skills/u-<kebab-name>/SKILL.md` — one folder per skill
- Frontmatter: `name`, `description` (with `Triggers — ...` keyword list) — these drive routing
- Body shape: TL;DR → When to load → sections (templates, decision matrix, do/don't, see also)
- Keep ≤300 lines for most skills; ≤600 for orchestrator (`u-task`, `u-fix-bug`)
- One concept per skill. Don't bundle. Cross-link via "See also"

## When to load

You're writing a brand-new skill, splitting an overlong skill, or auditing skill style consistency before a release.

---

## Naming

```
u-<purpose>      kebab-case
                 short — 1-3 hyphens
                 verb-shape if action ("u-fix-bug", "u-review")
                 noun-shape if concept ("u-architecture", "u-design-system")
```

Avoid `u-helper`, `u-utils`, `u-misc` — too vague, won't be discovered.

---

## File location

```
.claude/skills/u-<name>/
  SKILL.md
```

The folder must exist before Write. The skill name in frontmatter MUST match the folder name.

---

## Frontmatter

```yaml
---
name: u-<kebab-name>
description: 'One-line summary. Triggers — keyword1, keyword2, keyword3, ...'
---
```

**`description` rules:**

- Starts with what the skill IS / DOES
- Includes a `Triggers — ...` sentence listing 8–20 keywords/phrases that should auto-load this skill
- Triggers are the routing signal — be generous, include synonyms ("e2e, end to end, automation")
- Verbs in present tense ("create, edit, debug")

---

## Body skeleton

```markdown
# u-<name> — Short title

## TL;DR

- Bullet list (4–8 items)
- Concrete rules: "Use X, never Y"
- File names, function names, exact decisions
- Skip the philosophy — point to it in "See also"

## When to load

One paragraph. What kind of task? What signal in the user prompt?

---

## <Section: the main concept>

[Template / pattern / decision matrix.]

## <Section: secondary concept>

[Concrete code or example.]

---

## Do / Don't

| ✅        | ❌        |
| --------- | --------- |
| Right way | Wrong way |
| Right way | Wrong way |

## Common pitfalls

- Pitfall: cause → fix
- Pitfall: cause → fix

---

## See also

- `u-related-skill` — why it relates
```

---

## Style rules

| Rule                                         | Why                                            |
| -------------------------------------------- | ---------------------------------------------- |
| One concept per skill                        | Loadable lean; not 1000-line god skill         |
| Templates over prose                         | LLM follows examples better than instructions  |
| Decision matrix > bullet list                | Matrix forces pick-one                         |
| `Do / Don't` table                           | Crisp anti-patterns next to patterns           |
| Cross-link via "See also"                    | Avoid duplication; allow on-demand load        |
| File:line citations when referencing code    | Disambiguates, faster to verify                |
| No emojis (only if user explicitly requests) | Project convention                             |
| Concrete > abstract                          | "Use `useShallow`" beats "Optimize re-renders" |

---

## Trigger catalog (typical patterns)

| Skill type     | Triggers should include                                   |
| -------------- | --------------------------------------------------------- |
| Layer / domain | Layer name, file pattern, "where does X go"               |
| Tooling        | Command names, file extensions, error strings             |
| Pattern        | Pattern name, common pain points, related libs            |
| Audit          | Audit verbs ("review", "check", "audit"), severity levels |
| Generator      | Generator name, "scaffold", "create"                      |

---

## Example: a minimal skill

```markdown
---
name: u-debounce
description: 'Debouncing hook patterns and when to use vs throttle. Triggers — debounce, throttle, useDebounce, lodash debounce, search input, expensive callback.'
---

# u-debounce — Debouncing in RN

## TL;DR

- Use `useDebouncedValue(v, ms)` for derived values (search input → query)
- Use `useDebouncedCallback(fn, ms)` for handlers (button press dedupe)
- Default delay: 300ms search, 500ms expensive write
- Throttle for scroll/resize; debounce for finalised value
- Don't debounce inside `useEffect` — debounce the callback the effect dispatches

## When to load

Search input feels janky, "we're firing X too often", choosing between debounce / throttle / requestAnimationFrame.

---

[... main body ...]

## See also

- `u-form` — debounced async validation
- `u-performance` — measuring excessive re-renders
```

Keeps under 100 lines. Skills aren't textbooks — they're conventions cards.

---

## Author checklist

- [ ] Folder `u-<name>/` created
- [ ] Frontmatter with `name` matching folder, `description` ending in `Triggers — ...`
- [ ] TL;DR has 4–8 concrete bullets
- [ ] "When to load" paragraph is specific
- [ ] At least one template / decision table
- [ ] Do / Don't table
- [ ] "See also" links to related skills
- [ ] Under 300 lines (or < 600 for orchestrators)
- [ ] No emojis (unless user asked)
- [ ] Lint pass: `markdownlint .claude/skills/u-<name>/SKILL.md`

---

## Do / Don't

| ✅                              | ❌                                    |
| ------------------------------- | ------------------------------------- |
| One responsibility per skill    | Bundle 3 concepts in one file         |
| Concrete examples               | Pure prose / philosophy               |
| `Triggers — ...` in description | No keyword list (won't auto-load)     |
| Cross-link, don't repeat        | Copy-paste content from related skill |
| Verb-first triggers             | Past-tense triggers                   |

---

## See also

- `u-review-skill` — audits an existing skill against this template
- `u-architecture` — top-level skill that other skills reference
- `u-doc` — broader documentation patterns (skills are a doc type)
- `u-task` / `u-fix-bug` — orchestrator examples with multi-phase structure
