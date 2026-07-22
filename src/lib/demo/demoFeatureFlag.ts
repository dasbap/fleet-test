export const IS_PRODUCTION_BUILD = import.meta.env.PROD;

export const DEMO_FEATURE_ENABLED =
  import.meta.env.VITE_ENABLE_DEMO_UI === "true" || !IS_PRODUCTION_BUILD;
