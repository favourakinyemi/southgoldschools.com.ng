import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES } from '../src/publicRoutes';
import { CMS } from '../src/server/repo';

const SITE_URL = 'https://southgoldschools.com.ng';

// CMS content (and its updated_at) can change at any time without a
// rebuild, so this needs to be computed per-request, not baked in at
// build time.
export const dynamic = 'force-dynamic';

// Derived from the same PUBLIC_ROUTES list LandingPage.tsx uses for its
// own client-side routing, so this can never drift out of sync with the
// app's actual routes -- a route only shows up here if it's both a real
// route the app handles AND marked indexable (i.e. not a /login/* auth
// entry point). Adding a new public page to PUBLIC_ROUTES is enough for
// it to appear here automatically.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The homepage is entirely CMS-driven, so its real last-modified time
  // is whenever the CMS content was last saved -- not "whenever this
  // sitemap happened to be requested", which search engines treat as an
  // untrustworthy signal. Falls back to now() if migration 0014 (which
  // adds cms_content.updated_at) hasn't been applied yet.
  const cmsUpdatedAt = await CMS.getLastModified();

  return PUBLIC_ROUTES.filter((route) => route.indexable).map((route) => ({
    url: `${SITE_URL}${route.path === '/' ? '' : route.path}`,
    lastModified: cmsUpdatedAt ?? new Date(),
    changeFrequency: 'weekly' as const,
    priority: route.path === '/' ? 1 : 0.7,
  }));
}
