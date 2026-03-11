import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/.netlify/functions/:path*",
        destination: "/api/:path*"
      }
    ]
  }
};

export default nextConfig;
