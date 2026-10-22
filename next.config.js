/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // lint errors now fail the build instead of being silently ignored
    ignoreDuringBuilds: false,
  },
  images: { unoptimized: true },
  experimental: {
    cpus: 1,
  },
};

module.exports = nextConfig;
