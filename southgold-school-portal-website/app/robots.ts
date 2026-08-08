import type { MetadataRoute } from 'next';

const SITE_URL = 'https://southgoldschools.com.ng';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Role-specific login forms and the authenticated portal behind them
      // aren't content pages -- nothing useful to index, and the portal
      // requires a session anyway.
      disallow: ['/login', '/login/*', '/api/*'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
