/**
 * Point d’entrée module « app mobile V1 » — Flotte E-Samba.
 * Les écrans restent sous `src/pages/mobile` et `src/features` ; ce dossier regroupe
 * manifestes, registres natifs et réexports utiles au produit mobile.
 */

export { NATIVE_PLUGINS_REGISTRY, type NativePluginEntry, type NativePluginId } from "./nativePlugins.registry";
export { MOBILE_TAB_ROUTES, type MobileTabRouteId } from "./routes.manifest";
