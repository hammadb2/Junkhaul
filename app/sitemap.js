// app/sitemap.js
const BASE = 'https://junkhaul.ca';
const now = new Date();

const pages = [
  // Core pages
  { url: '', priority: 1, changeFrequency: 'weekly' },
  { url: '/book', priority: 0.9, changeFrequency: 'weekly' },
  { url: '/faq', priority: 0.7, changeFrequency: 'monthly' },

  // Service pages (residential)
  { url: '/residential-junk-removal', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/garage-cleanouts', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/basement-attic-cleanouts', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/estate-cleanouts', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/storage-unit-cleanouts', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/furniture-removal', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/appliance-removal', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/renovation-debris-removal', priority: 0.8, changeFrequency: 'monthly' },

  // Commercial pages
  { url: '/commercial-junk-removal', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/commercial-junk-removal/property-management', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/commercial-junk-removal/construction-debris', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/commercial-junk-removal/office-cleanouts', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/commercial-junk-removal/eviction-cleanouts', priority: 0.7, changeFrequency: 'monthly' },

  // Location pages
  { url: '/junk-removal-cranston', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-mahogany', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-panorama-hills', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-evergreen', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-auburn-bay', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-cornerstone', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-coventry-hills', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-mckenzie-towne', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-new-brighton', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/junk-removal-copperfield', priority: 0.7, changeFrequency: 'monthly' },
];

export default function sitemap() {
  return pages.map((p) => ({
    url: `${BASE}${p.url}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
