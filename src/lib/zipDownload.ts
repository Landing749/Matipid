import JSZip from 'jszip'

export interface ZipPhoto {
  url: string
  caption?: string
}

function extFor(url: string) {
  const m = url.match(/\.(jpe?g|png|webp|gif|avif)(?:$|\?)/i)
  return m ? m[1].toLowerCase() : 'jpg'
}

function safeName(s: string) {
  return s.trim().replace(/[^\w\- ]+/g, '').trim()
}

/**
 * Fetches every photo, bundles them into a single zip, and triggers a
 * browser download. Photos that fail to fetch (CORS, deleted, etc.) are
 * silently skipped rather than failing the whole batch.
 *
 * Returns the number of photos successfully included.
 */
export async function downloadPhotosAsZip(
  photos: ZipPhoto[],
  zipFilename: string,
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const zip = new JSZip()
  let done = 0
  let included = 0

  await Promise.all(
    photos.map(async (photo, i) => {
      try {
        const res = await fetch(photo.url)
        if (!res.ok) throw new Error('fetch failed')
        const blob = await res.blob()
        const base = safeName(photo.caption || `photo-${i + 1}`) || `photo-${i + 1}`
        const name = `${String(i + 1).padStart(2, '0')}-${base}.${extFor(photo.url)}`
        zip.file(name, blob)
        included++
      } catch {
        // Skip photos that can't be fetched (e.g. CORS-restricted hosts).
      } finally {
        done++
        onProgress?.(done, photos.length)
      }
    })
  )

  if (included === 0) return 0

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return included
}
