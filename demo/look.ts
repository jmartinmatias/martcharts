/** The site-wide look from public/site-look.js: the theme and style preset picked on any page. */
export interface Look {
  theme?: string;
  preset?: string;
  /** The language charts read in: en, fr or de. */
  lang?: string;
}

declare global {
  interface Window {
    siteLook?: {
      get(): Look;
      set(patch: Look): Look;
      locale?(): string | undefined;
      t?(english: string, ...values: unknown[]): string;
      translate?(): void;
    };
  }
}

/** The locale the site's charts draw in ("fr-FR", "de-DE"), or undefined for English (the specs' own). */
export const siteLocale = (): string | undefined => window.siteLook?.locale?.();

/** A spec in the site's language, when one other than English is picked. */
export function withLocale<T extends { locale?: string }>(spec: T): T {
  const locale = siteLocale();
  return locale ? { ...spec, locale } : spec;
}

export const look = (): Look => window.siteLook?.get() ?? {};

/** The site's own word for an English one, in the language picked (public/site-look.js); the English without it. */
export const siteWord = (english: string, ...values: unknown[]): string =>
  window.siteLook?.t?.(english, ...values) ?? english.replace(/\{(\d)\}/g, (_, i: string) => String(values[Number(i)] ?? ""));
export const setLook = (patch: Look): void => void window.siteLook?.set(patch);
/** The saved preset as a style patch for a spec, or nothing when it is the default. */
export const lookStyle = (): { preset: string } | undefined => {
  const preset = look().preset;
  return preset && preset !== "default" ? { preset } : undefined;
};

/** The spec in the saved look, unless it already chose its own preset (a Taller version picks its card). */
export function withLook<T extends { style?: { preset?: string } }>(spec: T, fork: (spec: T, patch: { style: { preset: string } }) => T): T {
  const style = lookStyle();
  return style && !spec.style?.preset ? fork(spec, { style }) : spec;
}
