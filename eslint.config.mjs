import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local dev artefacts: hackathon scratch + extracted design references.
    // The design-pkg JSX files use `window.X` and unescaped quotes; they're
    // for visual reference only, never imported by the app, never shipped.
    "tmp/**",
    "scratch/**",
  ]),
]);

export default eslintConfig;
