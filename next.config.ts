import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/products/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // En-tetes de securite (2026-11-19, audit externe relaye par Hedi) --
      // pas de Content-Security-Policy complete pour l'instant (demande
      // explicite de Hedi). Appliques a TOUTES les routes : controlent
      // uniquement si NOTRE page peut etre encadree par un AUTRE site
      // (clickjacking), jamais ce que NOUS embarquons nous-memes -- sans
      // effet sur la redirection Stripe Checkout, l'iframe du bouton
      // Apple Pay/Google Pay (src/components/product/ExpressCheckoutButton.tsx)
      // ni l'embed Google Maps des salons (src/components/GoogleMapEmbed.tsx),
      // qui sont tous des elements QUE NOUS chargeons dans notre page, pas
      // l'inverse.
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
};

export default nextConfig;
