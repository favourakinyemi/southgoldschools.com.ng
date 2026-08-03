/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // All /api/* routes read/write live data on every request (force-dynamic).
  // Without an explicit no-store, Netlify's edge can still cache a response
  // for a short window, so a save can appear not to "take effect" until a
  // later request happens to miss that cache.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
