import crypto from 'node:crypto';
export function base32(bytes=crypto.randomBytes(20)){return bytes.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_').toUpperCase()}
function key(s:string){return Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'),'base64')}
export function code(secret:string,time=Date.now()){const counter=Math.floor(time/30000);const b=Buffer.alloc(8);b.writeBigInt64BE(BigInt(counter));const h=crypto.createHmac('sha1',key(secret)).update(b).digest();const o=h[h.length-1]&15;return String((h.readUInt32BE(o)&0x7fffffff)%1000000).padStart(6,'0')}
export function valid(secret:string,value:string){return [code(secret,Date.now()-30000),code(secret),code(secret,Date.now()+30000)].includes(value)}
