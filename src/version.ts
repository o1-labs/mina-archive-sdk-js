/**
 * The Archive-Node-API schema version this SDK speaks.
 *
 * This constant — not the package version — is the compatibility check. The
 * package version is plain semver about the SDK's own surface, so an SDK-only
 * breaking change can take a major without claiming the schema moved.
 *
 * The schema is additive within a major version, so an SDK whose
 * `SCHEMA_VERSION` major matches the server keeps working against a newer
 * server; it simply cannot reach what was added after it.
 */
export const SCHEMA_VERSION = '1.0';
