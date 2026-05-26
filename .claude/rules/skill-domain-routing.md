# Skill Domain Routing

This is an **Expo React Native** app. All domain work routes to a `u-*` skill.
`u-task` loads these automatically — this table is for picking the right one when
working a specific layer directly.

## Presentation Layer (screens, UI, state)

```
User wants to...
├── Build a screen / route / layout              → u-screen
├── Animations, gestures, lists, modals, toasts  → u-rn-ui
├── Design tokens, NativeWind, dark mode, spacing → u-design-system
├── Bottom sheets (@gorhom/bottom-sheet)         → u-sheet
├── Forms (react-hook-form + zod)                → u-form
├── Feature-local Zustand store (*-store.ts)     → u-controller
├── Global store (auth/theme/connectivity)       → u-global-store
└── Decide useState vs Zustand vs TanStack Query → u-reactive-state
```

## Domain & Data Layers

```
User wants to...
├── Use-case hooks (useQuery/useMutation)        → u-usecase
├── Repository module (business logic layer)     → u-repository
├── axios client, interceptors, error mapping    → u-api
├── Navigation, deeplinks, route guards          → u-navigation
└── MMKV / expo-secure-store, StorageKeys        → u-storage
```

## Cross-Cutting Concerns

```
User wants to...
├── Layer boundaries, file placement, DI         → u-architecture
├── AppError / try-catch / snackbar              → u-error-handling
├── i18n keys (vi.json + en.json parity)         → u-i18n
├── Sentry events, analyticPerformer             → u-analytics
├── Token storage, transport, app-bundle secrets → u-security
├── Accessibility (WCAG AA, touch targets)       → u-accessibility
└── Re-render waste, list virtualization, memory → u-performance
```

## Tooling & Quality

```
User wants to...
├── Plop, yarn scripts, expo prebuild, eas build → u-codegen
├── Unit / integration tests (Jest + RNTL)       → u-testing
├── Real-device E2E (Maestro YAML)               → u-verify
├── Safe refactor (extract, split store, rename) → u-refactor
├── Storybook stories for design system          → u-storybook
├── Select / install an npm package              → u-npm-package
├── READMEs, ADRs, changelog, feature docs       → u-doc
├── Isolated git worktree per feature/fix        → u-worktree
├── Create or audit a u-* skill                  → u-create-skill / u-review-skill
└── Project-grounded question / brainstorm        → u-ask
```

## Utility Skills (no u-\* equivalent)

```
User wants to...
├── Search library/framework docs (context7)     → docs-seeker
├── Create diagrams (Mermaid v11 syntax)         → mermaidjs-v11
├── Visual code walkthrough / slides / diagram   → preview
├── Analyze/generate image, audio, video with AI → ai-multimodal
├── Process media (FFmpeg, ImageMagick)          → media-processing
├── Pack codebase for LLM context                → repomix
├── Git staging, conventional commits, PRs       → git
├── Discover / execute MCP server tools          → mcp-management / use-mcp
├── Step-by-step reasoning for hard problems     → sequential-thinking
└── Multi-session parallel collaboration          → team
```

## Usage Notes

- Pick ONE skill per distinct user intent.
- `u-task` orchestrates these automatically — load a domain skill by hand only
  when working that single layer in isolation.
- Skills not listed are workflow orchestrators — see `skill-workflow-routing.md`.
