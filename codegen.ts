/**
 * Generates `src/generated/schema-types.ts` from the vendored `schema.graphql`.
 *
 * The generated file is committed and CI regenerates it; a diff fails the
 * build. `src/types.ts` stays hand-written — it carries the doc comments a
 * generator cannot produce — and asserts mutual assignability against the
 * generated shapes in `src/generated/conformance.ts`, so a hand-written type
 * that drifts from the SDL cannot compile.
 */
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './schema.graphql',
  generates: {
    './src/generated/schema-types.ts': {
      plugins: ['typescript'],
      config: {
        // No documents are generated, so `__typename` would be noise.
        skipTypename: true,
        // Match the hand-written style: unions of literals, not TS enums.
        enumsAsTypes: true,
        // A nullable OUTPUT field is present-and-null, not absent, so model it
        // `T | null` rather than `field?:`. Nullable INPUT fields really are
        // omittable, so those keep the `?`.
        avoidOptionals: { field: true, inputValue: false, object: true },
        // The one custom scalar. The SDL uses it for ISO-8601 instants.
        scalars: { DateTime: 'string' },
        useTypeImports: true,
      },
    },
  },
};

export default config;
