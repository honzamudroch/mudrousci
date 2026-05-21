/**
 * Převede Supabase Storage URL na thumbnail přes Supabase Image Transform.
 * Endpoint /render/image/public/ resizuje obrázek server-side — vrací WebP.
 * Funguje zdarma na všech Supabase planech.
 */
export function thumbUrl(
  url: string | null | undefined,
  width: number,
  quality = 75
): string {
  if (!url) return ''
  if (!url.includes('/storage/v1/object/public/')) return url
  return (
    url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=${quality}`
  )
}

/**
 * Komprimuje obrázek před uploadem pomocí Canvas API (bez knihoven).
 * iPhone fotka 5 MB → ~350 KB při zachování vizuální kvality pro web.
 * maxWidth: max šířka výsledku v px (výška se přizpůsobí poměrem stran)
 * quality: 0–1, doporučeno 0.82 pro JPEG
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.82
): Promise<File> {
  // Pokud to není obrázek, vrať bez změny
  if (!file.type.startsWith('image/')) return file

  return new Promise(resolve => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Zmenši pouze pokud je větší než maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        blob => {
          if (!blob) { resolve(file); return }
          // Výsledný soubor jako .jpg
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file) // fallback: upload originál
    }

    img.src = objectUrl
  })
}
