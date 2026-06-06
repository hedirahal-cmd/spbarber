import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/cart', '/checkout', '/success'],
      },
    ],
    sitemap: 'https://spbarber.fr/sitemap.xml',
    host: 'https://spbarber.fr',
  }
}
