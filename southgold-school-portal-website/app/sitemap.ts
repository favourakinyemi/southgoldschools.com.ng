import type { MetadataRoute } from 'next';

const SITE_URL = 'https://southgoldschools.com.ng';

export default function sitemap(): MetadataRoute.Sitemap {
  // The site is effectively a single public page (the landing page, with
  // in-page sections for activities/news/gallery/admissions) plus a set of
  // role-specific login forms that robots.ts excludes from indexing -- so
  // there's just the one URL worth listing here.
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
