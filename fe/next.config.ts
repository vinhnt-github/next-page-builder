import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'host.docker.internal'], // Add your backend domain here
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'host.docker.internal',
        port: '8080',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
