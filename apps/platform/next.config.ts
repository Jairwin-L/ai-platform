import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
	turbopack: {
		// https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
    root: path.join(__dirname, '..'),
  },
};

export default nextConfig;
