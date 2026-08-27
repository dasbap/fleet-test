import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import noUndefinedCanPermissions from "./eslint-rules/no-undefined-can-permissions.js";

const esambaRules = {
  rules: {
    "no-undefined-can-permissions": noUndefinedCanPermissions,
  },
};

export default tseslint.config(
  {
    ignores: [
      "dist",
      "dev-dist/**",
      "test-results/**",
      "playwright-report/**",
      "docs/bootstrap/**",
      "android/**",
      "ios/**",
      "store-assets/**",
      "node_modules/**",
      "public/icons/**",
      "apps/mobile/.expo/**",
      "apps/**/.next/**",
      "apps/marketing/.astro/**",
      "apps/marketing/src/env.d.ts",
      "supabase/functions/**",
      ".claude/worktrees/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      esamba: esambaRules,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "esamba/no-undefined-can-permissions": "error",
      // Règles a11y progressives (warn) — montée en error après correction du backlog
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-role": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
    },
  },
  {
    files: ["src/test/**/*.mutation-coverage.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },
  {
    files: ["src/server/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
);
