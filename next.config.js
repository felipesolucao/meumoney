/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 14 lint integration does not understand ESLint 9 flat config: during
  // a build it falls through to the interactive "configure ESLint" prompt.
  // Linting runs from its own script instead -- `npm run lint`.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
