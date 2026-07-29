type Entry={count:number;resetAt:number};
const globalRate=globalThis as unknown as {aulaRate?:Map<string,Entry>};
const store=globalRate.aulaRate??new Map<string,Entry>();if(process.env.NODE_ENV!=="production")globalRate.aulaRate=store;
export function rateLimit(key:string,limit=8,windowMs=60_000){const now=Date.now(),current=store.get(key);if(!current||current.resetAt<=now){store.set(key,{count:1,resetAt:now+windowMs});return {allowed:true,retryAfter:0}}current.count++;return {allowed:current.count<=limit,retryAfter:Math.ceil((current.resetAt-now)/1000)}}
export function clientIp(request:Request){return request.headers.get("x-forwarded-for")?.split(",")[0].trim()||request.headers.get("x-real-ip")||"unknown"}
