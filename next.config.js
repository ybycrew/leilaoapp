/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

module.exports = nextConfig;
