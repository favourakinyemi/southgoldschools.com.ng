// Explicit route for Google Search Console's HTML verification file.
//
// The [[...slug]] optional catch-all page matches every path, including
// this exact filename. On Netlify's Next.js Runtime that route is served
// via an edge function, and edge functions run before Netlify's static
// asset matching *and* before any _redirects/netlify.toml rule -- so the
// identically named file sitting in public/ never actually got served;
// Google received the app's own 404 page instead. An explicit route wins
// Next.js's own routing precedence over the catch-all regardless of how
// the host serves static files, so it can't be shadowed the same way.
export async function GET() {
  return new Response('google-site-verification: googlea5a363ddc526766a.html', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
