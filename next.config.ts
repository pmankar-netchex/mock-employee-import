import type { NextConfig } from "next";

// On GitHub Pages this app lives under https://<user>.github.io/<repo>/.
// The build script sets PAGES_BASE_PATH to that "/<repo>" prefix; local dev
// (and root-of-domain hosts) leave it unset so links stay at "/".
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
