import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is enabled by default in dev mode
  // No webpack config needed for basic PWA functionality
  
  // PWA will be handled by service worker registration in the app
  experimental: {
    // Turbopack specific configs can go here if needed
  },
};

export default nextConfig;
