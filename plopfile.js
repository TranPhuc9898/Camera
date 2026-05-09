/** @param {import('plop').NodePlopAPI} plop */
module.exports = function (plop) {
  // ── 1. screen ──────────────────────────────────────────────────────────────
  plop.setGenerator('screen', {
    description: 'Create an Expo Router screen + feature screen component',
    prompts: [
      { type: 'input', name: 'route', message: 'Route path (e.g. (app)/profile):' },
      { type: 'input', name: 'feature', message: 'Feature name (e.g. profile):' },
      { type: 'input', name: 'name', message: 'Screen name (e.g. profile):' },
    ],
    actions: (data) => {
      const actions = [
        {
          type: 'add',
          path: 'app/{{route}}.tsx',
          templateFile: 'plop-templates/screen/route.hbs',
          skipIfExists: true,
        },
        {
          type: 'add',
          path: 'src/features/{{kebabCase feature}}/screens/{{kebabCase name}}-screen.tsx',
          templateFile: 'plop-templates/screen/screen.hbs',
          skipIfExists: true,
        },
        {
          type: 'add',
          path: 'src/features/{{kebabCase feature}}/components/.gitkeep',
          template: '',
          skipIfExists: true,
        },
      ];
      console.log(
        `\n  i18n reminder: Add "${data.feature}.${data.name}.title" to src/translations/vi.json + en.json\n`,
      );
      return actions;
    },
  });

  // ── 2. store ───────────────────────────────────────────────────────────────
  plop.setGenerator('store', {
    description: 'Create a Zustand store with MMKV persistence',
    prompts: [
      { type: 'input', name: 'name', message: 'Store name (e.g. cart):' },
      {
        type: 'list',
        name: 'scope',
        message: 'Scope:',
        choices: ['global', 'feature'],
        default: 'global',
      },
      {
        type: 'input',
        name: 'feature',
        message: 'Feature name (only for feature scope):',
        when: (a) => a.scope === 'feature',
      },
    ],
    actions: (data) => {
      const outputPath =
        data.scope === 'feature'
          ? 'src/features/{{kebabCase feature}}/use-{{kebabCase name}}-store.ts'
          : 'src/lib/stores/use-{{kebabCase name}}-store.ts';
      return [
        {
          type: 'add',
          path: outputPath,
          templateFile: 'plop-templates/store/store.hbs',
          skipIfExists: true,
        },
      ];
    },
  });

  // ── 3. api ─────────────────────────────────────────────────────────────────
  plop.setGenerator('api', {
    description: 'Create a feature API module implementing CrudApi<T>',
    prompts: [{ type: 'input', name: 'feature', message: 'Feature name (e.g. product):' }],
    actions: [
      {
        type: 'add',
        path: 'src/features/{{kebabCase feature}}/api.ts',
        templateFile: 'plop-templates/api/api.hbs',
        skipIfExists: true,
      },
    ],
  });

  // ── 4. usecase ─────────────────────────────────────────────────────────────
  plop.setGenerator('usecase', {
    description: 'Create a TanStack Query hook (useQuery or useMutation)',
    prompts: [
      { type: 'input', name: 'feature', message: 'Feature name (e.g. product):' },
      {
        type: 'input',
        name: 'action',
        message: 'Action (e.g. get, list, create, update, delete):',
      },
      {
        type: 'list',
        name: 'kind',
        message: 'Hook kind:',
        choices: ['query', 'mutation'],
        default: 'query',
      },
    ],
    actions: (data) => {
      const template =
        data.kind === 'mutation'
          ? 'plop-templates/usecase/usecase-mutation.hbs'
          : 'plop-templates/usecase/usecase-query.hbs';
      return [
        {
          type: 'add',
          path: 'src/features/{{kebabCase feature}}/use-cases/use-{{kebabCase action}}-{{kebabCase feature}}.ts',
          templateFile: template,
          skipIfExists: true,
        },
      ];
    },
  });

  // ── 5. sheet ───────────────────────────────────────────────────────────────
  plop.setGenerator('sheet', {
    description: 'Create a bottom-sheet component (Modal stub, swap for @gorhom/bottom-sheet)',
    prompts: [
      { type: 'input', name: 'feature', message: 'Feature name:' },
      { type: 'input', name: 'name', message: 'Sheet name (e.g. filter):' },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/features/{{kebabCase feature}}/components/{{kebabCase name}}-sheet.tsx',
        templateFile: 'plop-templates/sheet/sheet.hbs',
        skipIfExists: true,
      },
    ],
  });

  // ── 6. form ────────────────────────────────────────────────────────────────
  plop.setGenerator('form', {
    description: 'Create a react-hook-form + zod form component',
    prompts: [
      { type: 'input', name: 'feature', message: 'Feature name:' },
      { type: 'input', name: 'name', message: 'Form name (e.g. create-product):' },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/features/{{kebabCase feature}}/components/{{kebabCase name}}-form.tsx',
        templateFile: 'plop-templates/form/form.hbs',
        skipIfExists: true,
      },
    ],
  });
};
