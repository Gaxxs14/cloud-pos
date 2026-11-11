import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/pos',
        destination: '/dashboard/pos',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
