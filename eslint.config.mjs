import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [".next/**", ".next-cache/**", ".site-next/**", "node_modules/**"]
  },
  ...nextVitals,
  ...nextTypeScript
];

export default config;
