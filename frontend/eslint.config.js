import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import nextPlugin from "eslint-config-next";

export default [
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        React: true,
        JSX: true,
        fetch: true,
        WebSocket: true,
      },
    },
    plugins: {
      react,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-types": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    ignores: [
      "node_modules",
      ".next",
      "coverage",
      "dist",
      ".eslintrc.*",
      "next.config.js",
    ],
  },
];
