export const STORAGE_KEY = "nexus-theme";

/** Inline, run before paint (in <head>) — reads the stored/system preference
 * synchronously so the page never flashes light-mode before hydration. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
