import App from '../../src/App';
import { CMS } from '../../src/server/repo';

// The landing page's content (motto, hero, news, etc.) is CMS-driven and
// changes without a rebuild, so this needs to be fetched fresh on every
// request, not baked in at build time.
export const dynamic = 'force-dynamic';

export default async function CatchAllPage() {
  // Fetched server-side and passed down as the initial value so the first
  // paint already shows the real content -- without this, LandingPage
  // briefly renders its hardcoded fallback text (old school name, generic
  // copy) before its own client-side fetch resolves and replaces it,
  // visible as a flash of wrong content on slower connections.
  const initialCms = await CMS.get().catch(() => null);
  return <App initialCms={initialCms} />;
}
