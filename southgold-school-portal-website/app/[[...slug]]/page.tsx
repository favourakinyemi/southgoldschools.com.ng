import App from '../../src/App';
import { CMS } from '../../src/server/repo';
import type { Metadata } from 'next';

// The landing page's content (motto, hero, news, etc.) is CMS-driven and
// changes without a rebuild, so this needs to be fetched fresh on every
// request, not baked in at build time.
export const dynamic = 'force-dynamic';

const SITE_URL = 'https://southgoldschools.com.ng';
const SITE_NAME = 'SouthGold Schools';

const routeMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'SouthGold Schools | Private School in Sangotedo Lagos',
    description:
      'Discover SouthGold Schools in Sangotedo, Lagos, a warm private school community for Montessori, primary, and secondary education.',
  },
  '/about': {
    title: 'About & Academics | SouthGold Schools',
    description:
      'Learn about SouthGold Schools, our mission, vision, academics, character development, and learning experience in Sangotedo, Lagos.',
  },
  '/admissions': {
    title: 'Admissions & Contact | SouthGold Schools',
    description:
      'Begin your child\'s admission enquiry at SouthGold Schools in Sangotedo, Lagos. Contact the admissions team and learn about available programmes.',
  },
};

function pathFromParams(params?: { slug?: string[] }) {
  const slug = params?.slug ?? [];
  return slug.length ? `/${slug.join('/')}` : '/';
}

export async function generateMetadata({ params }: { params?: { slug?: string[] } }): Promise<Metadata> {
  const path = pathFromParams(params);
  const meta = routeMetadata[path] ?? routeMetadata['/'];
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_NG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    robots: path.startsWith('/login') ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function CatchAllPage() {
  // Fetched server-side and passed down as the initial value so the first
  // paint already shows the real content -- without this, LandingPage
  // briefly renders its hardcoded fallback text (old school name, generic
  // copy) before its own client-side fetch resolves and replaces it,
  // visible as a flash of wrong content on slower connections.
  const initialCms = await CMS.get().catch(() => null);
  return <App initialCms={initialCms} />;
}
