import type {Metadata} from 'next';
import './globals.css';
import './redesign.css';
import './sky.css';
import './care.css';
import {ThemeProvider} from '@/components/theme';
import {themeBootScript} from '@/lib/theme';
export const metadata:Metadata={
 title:'MedPro — Medicine details, together',
 description:'India-first medicine information and personal cabinet. Scan printed codes, check official CDSCO alerts, and share only with permission.',
 icons:{icon:'/favicon.svg'},
 manifest:'/manifest.webmanifest',
 openGraph:{
  title:'MedPro — check a medicine pack against official CDSCO alerts',
  description:'Save each pack, check its printed details against official CDSCO quality-report records, and share the evidence with your family. Offline-first. Not medical advice.',
  images:['/og-card.jpg'],
  type:'website',
 },
 twitter:{card:'summary_large_image',images:['/og-card.jpg']},
 ...(process.env.NEXT_PUBLIC_SITE_URL?{metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL)}:{metadataBase:new URL('http://localhost:3000')}),
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeBootScript}}/></head><body><ThemeProvider>{children}</ThemeProvider></body></html>;}
