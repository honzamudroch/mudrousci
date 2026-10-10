import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Naše cesta',
    short_name: 'Naše cesta',
    description: 'Naše společné vzpomínky',
    start_url: '/home',
    display: 'standalone',
    background_color: '#f4ede1',
    theme_color: '#ffffff',
    lang: 'cs',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
