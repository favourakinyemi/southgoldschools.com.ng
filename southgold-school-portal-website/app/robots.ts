import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES } from '../src/publicRoutes';

const SITE_URL = 'https://southgoldschools.com.ng';

// Non-indexable entries in PUBLIC_ROUTES (the /login/:role auth forms)
// are excluded here too, so this can't silently drift from sitemap.ts --
// both are generated from the same route list.
const disallowedRoutes = PUBLIC_ROUTES.filter((route) => !route.indexable).map((route) => route.path);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...disallowedRoutes, '/api/*'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
