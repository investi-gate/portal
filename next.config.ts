import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    swcPlugins: [
      ["@preact/signals-react-transform", {
        mode: "auto", // Only tracks components using .value access
      }]
    ]
  }
};

export default nextConfig;
