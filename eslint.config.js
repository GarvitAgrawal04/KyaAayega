import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules", "dist", "local", "ledger", "schema", "web", "coverage"],
  },
  ...[eslint.configs.recommended, ...tseslint.configs.recommended].map((c) => ({
    ...c,
    files: ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.ts"],
  })),
  {
    files: ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
    },
  },
);
