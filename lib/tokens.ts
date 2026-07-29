import { createHash, randomBytes } from "crypto";

export function newToken(){const raw=randomBytes(32).toString("hex");return {raw,hash:hashToken(raw)}}
export function hashToken(raw:string){return createHash("sha256").update(raw).digest("hex")}
