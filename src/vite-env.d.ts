/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Speckle server origin the viewer loads models from. Unset → the public
   * default in viewer-setup.ts (https://app.montyviewer.com).
   */
  readonly VITE_SPECKLE_SERVER?: string;
  /**
   * Optional Speckle access token for private projects, baked in at build time.
   * Dev convenience only — in production the planned OIDC layer (see
   * docs/superpowers/specs/2026-06-18-openaec-sso-viewer-design.md) supplies the
   * token at runtime via sessionStorage rather than shipping it in the bundle.
   */
  readonly VITE_SPECKLE_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
