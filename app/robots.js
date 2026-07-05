// app/robots.js
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/pay/'],
      },
    ],
    sitemap: 'https://junkhaul.ca/sitemap.xml',
  };
}
