import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
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
      "android/**",
      "ios/**",
      "store-assets/**",
      "node_modules/**",
      "public/icons/**",
      "apps/mobile/.expo/**",
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
      esamba: esambaRules,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "esamba/no-undefined-can-permissions": "error",
    },
  },
);
