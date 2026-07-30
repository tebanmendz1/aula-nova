import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers(){return [
    {source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},{key:"Content-Security-Policy",value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' https: http:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}]},
    {source:"/scorm/:path*",headers:[{key:"X-Frame-Options",value:"SAMEORIGIN"},{key:"Content-Security-Policy",value:"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; style-src 'self' 'unsafe-inline' data: https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https:; frame-src 'self' https: data: blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"}]},
  ]}
};

export default nextConfig;
