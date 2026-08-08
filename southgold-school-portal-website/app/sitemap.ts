import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES } from '../src/publicRoutes';

const SITE_URL = 'https://southgoldschools.com.ng';

// Derived from the same PUBLIC_ROUTES list LandingPage.tsx uses for its
// own client-side routing, so this can never drift out of sync with the
// app's actual routes -- a route only shows up here if it's both a real
// route the app handles AND marked indexable (i.e. not a /login/* auth
// entry point). Adding a new public page to PUBLIC_ROUTES is enough for
// it to appear here automatically.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.filter((route) => route.indexable).map((route) => ({
    url: `${SITE_URL}${route.path === '/' ? '' : route.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route.path === '/' ? 1 : 0.7,
  }));
}
