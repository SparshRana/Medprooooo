export type CaptureWord={text:string;line?:string;confidence:number;bbox:{x0:number;y0:number;x1:number;y1:number}};
export type CaptureField={name:'product'|'manufacturer'|'batch'|'expiry'|'strength'|'manufacturedOn';value:string;line:string;uncertain:boolean;box?:CaptureWord['bbox']};
export function parsePrintedPack(text:string,words:CaptureWord[]=[]):CaptureField[]{
 const boxFor=(line:string)=>{const matched=words.filter(w=>w.line?.trim()===line);return matched.length?{x0:Math.min(...matched.map(w=>w.bbox.x0)),y0:Math.min(...matched.map(w=>w.bbox.y0)),x1:Math.max(...matched.map(w=>w.bbox.x1)),y1:Math.max(...matched.map(w=>w.bbox.y1))}:undefined;};
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);const fields:CaptureField[]=[];
 const patterns:Array<[CaptureField['name'],RegExp]>=[['batch',/(?:batch(?:\s*(?:no|number))?|b\s*\.?\s*no|lot(?:\s*no)?)\s*[.:#-]*\s*([A-Z0-9][A-Z0-9/.-]{1,39})/i],['manufacturer',/(?:manufactured\s+by|mfd\s*by|manufacturer)\s*[:.-]*\s*(.{3,150})/i],['strength',/\b(\d+(?:\.\d+)?\s*(?:mcg|mg|g|iu|%)(?:\s*\+\s*\d+(?:\.\d+)?\s*(?:mcg|mg|g|iu|%))*)\b/i]];
 for(const [name,pattern] of patterns){const line=lines.find(l=>pattern.test(l));const match=line?.match(pattern);if(line&&match){fields.push({name,value:match[1].trim(),line,uncertain:true,box:boxFor(line)});}}
 const expiryLine=lines.find(l=>/(?:exp(?:iry)?|use before|best before)/i.test(l));
 if(expiryLine){const match=expiryLine.match(/\b(0?[1-9]|1[0-2])\s*[/.-]\s*(20\d{2}|\d{2})\b/);if(match){const year=match[2].length===2?'20'+match[2]:match[2];fields.push({name:'expiry',value:year+'-'+match[1].padStart(2,'0'),line:expiryLine,uncertain:true,box:boxFor(expiryLine)});}}
 // Product names are candidates only; never infer a product from a barcode or a blurry line.
 const nameLine=lines.find(l=>/^[A-Za-z][A-Za-z0-9 ()+.-]{2,79}$/.test(l)&&!/(?:batch|mfd|exp|manufactur|schedule|prescription|warning|storage|mrp|marketed|keep out|composition|tablets? ip|capsules? ip)/i.test(l));
 if(nameLine)fields.unshift({name:'product',value:nameLine,line:nameLine,uncertain:true,box:boxFor(nameLine)});return fields;
}
export function photoHints(width:number,height:number,pixels:Uint8ClampedArray){
 const hints:string[]=[];if(Math.min(width,height)<600)hints.push('Move closer or use a higher-resolution photo.');
 let sum=0,bright=0,edges=0,count=0;const stride=Math.max(1,Math.floor(width/160));
 for(let y=1;y<height-1;y+=stride)for(let x=1;x<width-1;x+=stride){const i=(y*width+x)*4;const light=(pixels[i]+pixels[i+1]+pixels[i+2])/3;sum+=light;bright+=Number(light>248);edges+=Math.abs(light-(pixels[i-4]+pixels[i-3]+pixels[i-2])/3);count++;}
 if(count&&sum/count<65)hints.push('Add more light without covering the label with a shadow.');if(count&&bright/count>.4)hints.push('Check for glare or a white background hiding the print.');if(count&&edges/count<3)hints.push('Check focus and keep the printed panel flat.');return hints;
}
