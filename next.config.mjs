/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const config = {
  output: 'export',
  basePath: isProd ? '/pref-puzzle' : '',
  trailingSlash: true,
  images: { unoptimized: true },
  webpack(cfg) {
    cfg.resolve.fallback = { fs: false, path: false };
    return cfg;
  },
};
export default config;
