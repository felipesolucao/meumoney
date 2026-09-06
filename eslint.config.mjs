// Fast lint tier. Everything here runs without type information, which is
// what keeps it quick enough for a pre-commit hook. The rules that need the
// type checker live in eslint.typed.config.mjs and run on their own script.
//
// Shape of this project, which is what the paths below encode:
//   - source root is the repository root (no src/): app/, components/, lib/,
//     middleware.ts
//   - presentation layer is the rendering code: app/**/*.tsx and
//     components/**. The route handlers under app/api/**/route.ts are the
//     server layer, not presentation -- they are allowed to touch Prisma
//   - the data module is lib/prisma.ts, exporting `prisma`
//   - there is no log adapter, so no file is exempt from no-direct-console
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

import quality from "./eslint-rules/index.cjs";

export default defineConfig([
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      // js.configs.recommended turns on no-undef, which knows nothing about
      // the runtime this project targets. typescript-eslint switches no-undef
      // off for .ts/.tsx, so this list is what keeps the plain .js/.mjs files
      // (next.config.js, prisma/seed.js) from drowning in no-undef noise.
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        window: "readonly",
        alert: "readonly",
        confirm: "readonly",
        Request: "readonly",
        Response: "readonly",
        TextEncoder: "readonly",
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strict,

  // Framework presets stay off. This is a Next.js 14 App Router project, but
  // eslint-config-next does not run under ESLint 9 flat config on Next 14 --
  // adding it here is what would break the lint script, not what would
  // improve it. Revisit when the project moves to Next 15.

  {
    // import-x resolves TypeScript path aliases and relative paths, so it
    // catches the app -> lib/prisma boundary no matter which spelling of the
    // import someone uses. The two no-restricted-paths entries are the
    // architecture boundary: the first plugin key carries what must never
    // regress, the second carries the debt that already exists.
    plugins: { "import-x": importX, "import-x-debt": importX },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "import-x/no-unresolved": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // Zero violations today: no component imports the client. This
            // is the part of the boundary that must never regress.
            { target: "./components/**/*", from: "./lib/prisma.ts" },
          ],
        },
      ],
      // The same package, registered a second time under a different plugin
      // key. Flat config cannot mix severities inside one rule's `zones`
      // array, and two blocks matching the same files replace each other
      // rather than merging their zones -- so an aliased key is the only way
      // to run "error" zones and "warn" zones side by side. Put pre-existing
      // boundary debt here, fix it, then promote the zone into the block
      // above and delete it from this one.
      "import-x-debt/no-restricted-paths": [
        "warn",
        {
          // Baseline: 6 server components query Prisma inline. Route
          // handlers under app/api/ are deliberately not targeted; they are
          // the server layer. `app/page.tsx` is listed on its own because a
          // leading `**` is not guaranteed to match zero segments.
          zones: [
            {
              target: [
                "./app/page.tsx",
                "./app/**/page.tsx",
                "./app/**/layout.tsx",
              ],
              from: "./lib/prisma.ts",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "lib/**/*.ts",
      "middleware.ts",
    ],
    plugins: { quality },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-var": "error",
      "prefer-const": "error",
      // Baseline: 2 violations. Back to "error" when the count reaches zero.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // From tseslint.configs.strict, which starts it at "error". Baseline: 6
      // violations, so it starts as a warning here instead of failing the
      // lint script on code that already existed.
      "@typescript-eslint/no-explicit-any": "warn",
      // The size and complexity budget is all "warn" on purpose. These
      // numbers are a conversation starter about factoring, not a gate --
      // promote one to "error" once the count for it reaches zero.
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-statements": ["warn", 20],
      "max-params": ["warn", 4],
      "max-lines-per-function": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      "max-nested-callbacks": ["warn", 3],
      // Stays at "error" with a one-file baseline list instead of dropping to
      // "warn": a single known offender is better named than tolerated
      // everywhere. Remove the entry once the file is split.
      "quality/max-lines": [
        "error",
        {
          max: 350,
          ignore: ["app/financeiro/novo/page.tsx"], // 430 lines
        },
      ],
      // Baseline: 4 violations (2 API routes + 2 error boundaries). The
      // project has no log adapter yet; when it gets one, exempt that file in
      // a block placed AFTER this one and promote this back to "error".
      "quality/no-direct-console": [
        "warn",
        { logger: "the project logging helper" },
      ],
      // Baseline: 6 violations, all server components in app/.
      // `layers` deliberately does not list "/app/": the option is a substring
      // match, so "/app/" would also guard app/api/**/route.ts, which is the
      // server layer and is meant to reach Prisma. The ".tsx" extension is
      // what covers the pages under app/.
      "quality/no-direct-data-access": [
        "warn",
        {
          modules: [
            "@/lib/prisma",
            "../lib/prisma",
            "../../lib/prisma",
            "../../../lib/prisma",
            "../../../../lib/prisma",
          ],
          bindings: ["prisma"],
          layers: ["/components/"],
          extensions: [".tsx"],
        },
      ],
    },
  },
  {
    // Standalone tooling and config files: CommonJS, Node-only, and not the
    // application this config polices. They get correct globals so no-undef
    // stays quiet, and none of the quality/* rules -- console is the output
    // channel of a seed script, not a logging mistake.
    files: ["*.js", "prisma/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        exports: "writable",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["eslint-rules/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly", require: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    // Agent harness files, vendored automation and build output are not the
    // application this config polices.
    ".claude/**",
    ".github/agents/**",
    ".github/hooks/**",
    ".github/skills/**",
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "public/**",
    "**/*.tsbuildinfo",
    "package-lock.json",
    "next-env.d.ts",
  ]),
]);
