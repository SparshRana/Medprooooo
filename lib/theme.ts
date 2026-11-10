export type Theme='light'|'dark';
export const THEME_KEY='carely:theme';
export const resolveTheme=(stored:string|null,systemDark:boolean):Theme=>stored==='light'||stored==='dark'?stored:systemDark?'dark':'light';
// Runs before paint. Storage failure falls back to the device preference.
export const themeBootScript=`(()=>{let saved=null;try{saved=localStorage.getItem('carely:theme')}catch{}const theme=saved==='light'||saved==='dark'?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme})()`;
