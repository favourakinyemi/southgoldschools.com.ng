import './globals.css';
import type { Metadata } from 'next';

const SITE_URL = 'https://southgoldschools.com.ng';
const SITE_NAME = 'SouthGold Montessori School';
const DESCRIPTION =
  'SouthGold Montessori School is a Montessori-based Preschool, Primary, and Junior Secondary school in Sangotedo, Lagos, Nigeria. Explore our curriculum, campus, and school portal, or apply for admission.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Preschool, Primary & Junior Secondary in Lagos`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'SouthGold Montessori School',
    'Montessori school Lagos',
    'Sangotedo school',
    'Lekki Ajah school',
    'primary school Lagos Nigeria',
    'preschool Lagos',
    'school admissions Lagos',
    'school portal',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: `${SITE_NAME} | Preschool, Primary & Junior Secondary in Lagos`,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Preschool, Primary & Junior Secondary in Lagos`,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'School',
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  telephone: '+234 803 123 4567',
  email: 'southgoldmontessorischools@gmail.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '3, Fagbeyi Ige, Olusi Crescent, Hopeville Estate, Haruna Bus-Stop',
    addressLocality: 'Sangotedo, Ajah',
    addressRegion: 'Lagos',
    addressCountry: 'NG',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
