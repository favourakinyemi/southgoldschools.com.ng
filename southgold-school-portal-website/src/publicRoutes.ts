// Single source of truth for every path the app's client-side router
// (LandingPage.tsx) recognizes, shared with app/sitemap.ts and
// app/robots.ts so SEO metadata can never drift out of sync with the
// app's actual routes. There is no server-side router involved --
// app/[[...slug]]/page.tsx renders <App /> for every path, and App.tsx
// / LandingPage.tsx decide what to show based on the URL.
//
// `indexable: true` means "a real, publicly readable page that should
// be in the sitemap and allowed in robots.txt". Auth entry points
// (/login and /login/:role) are real routes the app handles, but
// they're utility pages, not content -- excluded from both.
export interface PublicRoute {
  path: string;
  indexable: boolean;
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: '/', indexable: true },
  { path: '/about', indexable: true },
  { path: '/admissions', indexable: true },
  { path: '/login', indexable: false },
  { path: '/login/super-admin', indexable: false },
  { path: '/login/staff-admin', indexable: false },
  { path: '/login/teacher', indexable: false },
  { path: '/login/parent', indexable: false },
  { path: '/login/student', indexable: false },
  { path: '/forgot-password', indexable: false },
  { path: '/reset-password', indexable: false },
];
