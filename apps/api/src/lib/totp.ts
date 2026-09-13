import crypto from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes=crypto.randomBytes(20)){let bits=0,value=0,out='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5}}if(bits)out+=alphabet[(value<<(5-bits))&31];return out}
function key(value:string){let bits=0,current=0,out:number[]=[];for(const char of value.replace(/=+$/,'')){const index=alphabet.indexOf(char.toUpperCase());if(index<0)throw new Error('Invalid TOTP secret');current=(current<<5)|index;bits+=5;if(bits>=8){out.push((current>>>(bits-8))&255);bits-=8}}return Buffer.from(out)}
export function code(secret:string,time=Date.now()){const counter=Math.floor(time/30000),buffer=Buffer.alloc(8);buffer.writeBigInt64BE(BigInt(counter));const digest=crypto.createHmac('sha1',key(secret)).update(buffer).digest();const offset=digest[digest.length-1]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0')}
export function valid(secret:string,value:string){return [code(secret,Date.now()-30000),code(secret),code(secret,Date.now()+30000)].includes(value)}
