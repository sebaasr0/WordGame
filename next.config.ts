import type { NextConfig } from "next";

/**
 * GitHub Pages serves this repo from https://sebaasr0.github.io/WordGame/, not
 * from a domain root, so every asset URL needs the /WordGame prefix. That prefix
 * would break `next dev` on localhost, so it is only applied when the Pages
 * workflow sets GITHUB_PAGES.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const repo = "/WordGame";

const nextConfig: NextConfig = {
  // Emit a plain static site into out/ — Pages cannot run a Node server.
  output: "export",
  basePath: isPages ? repo : undefined,
  assetPrefix: isPages ? repo : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
