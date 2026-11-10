'use client';
import {useEffect,useRef} from 'react';
import {attachCardMotion} from '@/lib/card-motion';
export default function PremiumMotion({paused=false}:{paused?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);const scene=useRef<{pause:(value:boolean)=>void;dispose:()=>void}|null>(null);const pause=useRef(paused);
 useEffect(()=>{pause.current=paused;},[paused]);
 useEffect(()=>{let cancelled=false;const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const load=async()=>{if(cancelled||motion.matches||scene.current||!canvas.current)return;try{const {createCapsuleScene}=await import('./capsule-scene');if(cancelled||motion.matches||!canvas.current)return;scene.current=createCapsuleScene(canvas.current);scene.current.pause(pause.current);}catch{if(canvas.current)canvas.current.dataset.webgl='unavailable';}};
  const change=()=>{if(motion.matches){scene.current?.dispose();scene.current=null;if(canvas.current)canvas.current.dataset.webgl='static';}else void load();};
  // Defer the optional graphics bundle until the page is interactive.
  const timer=setTimeout(()=>void load(),350);motion.addEventListener('change',change);const cleanupCards=attachCardMotion(document.querySelector('.site')||document.body);
  return()=>{cancelled=true;clearTimeout(timer);motion.removeEventListener('change',change);scene.current?.dispose();scene.current=null;cleanupCards();};
 },[]);
 useEffect(()=>{scene.current?.pause(paused);},[paused]);
 return <div className="carely-capsule-background" aria-hidden="true" data-animation="capsules"><canvas ref={canvas}/><div className="capsule-static-fallback"><i/><i/></div></div>;
}
