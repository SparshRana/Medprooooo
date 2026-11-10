'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Moon,Sun} from 'lucide-react';
import {useI18n} from '@/components/language';
import {THEME_KEY,resolveTheme,type Theme} from '@/lib/theme';
const ThemeContext=createContext<{theme:Theme;toggle:()=>void}>({theme:'light',toggle:()=>{}});
export function ThemeProvider({children}:{children:ReactNode}){
 const [theme,setTheme]=useState<Theme>('light');
 useEffect(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)');
  const sync=()=>{let saved:string|null=null;try{saved=localStorage.getItem(THEME_KEY);}catch{}const value=resolveTheme(saved,media.matches);document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;setTheme(value);};
  sync();media.addEventListener('change',sync);const storage=(event:StorageEvent)=>{if(event.key===THEME_KEY||event.key===null)sync();};window.addEventListener('storage',storage);
  return()=>{media.removeEventListener('change',sync);window.removeEventListener('storage',storage);};
 },[]);
 const toggle=()=>{const next=theme==='dark'?'light':'dark';setTheme(next);document.documentElement.dataset.theme=next;document.documentElement.style.colorScheme=next;try{localStorage.setItem(THEME_KEY,next);}catch{}};
 return <ThemeContext.Provider value={{theme,toggle}}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle(){const {theme,toggle}=useContext(ThemeContext);const {t}=useI18n();return <button className="theme-toggle" type="button" aria-label={t('Toggle dark mode')} aria-pressed={theme==='dark'} title={t(theme==='dark'?'Switch to light mode':'Switch to dark mode')} onClick={toggle}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}<span>{t(theme==='dark'?'Light':'Dark')}</span></button>;}
