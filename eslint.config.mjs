import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { linterOptions: { reportUnusedDisableDirectives: false } },
  { ignores: ['.next/**', 'node_modules/**', 'dist/**', 'out/**', 'apps/**'] },
  ...compat.extends('next/core-web-vitals'),
];

export default eslintConfig;
