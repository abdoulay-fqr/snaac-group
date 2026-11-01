import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imapflow embarque pino, qui ne supporte pas d'etre bundle.
  serverExternalPackages: ["imapflow"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.iconify.design",
      },
    ],
  },
};

export default nextConfig;
