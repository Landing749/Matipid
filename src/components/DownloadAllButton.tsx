import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { downloadPhotosAsZip, type ZipPhoto } from '@/lib/zipDownload'

/** "Download all photos" button — zips and downloads a set of photos, with progress feedback. */
export function DownloadAllButton({
  photos,
  zipFilename,
  label = 'Download all',
}: {
  photos: ZipPhoto[]
  zipFilename: string
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  async function handleClick() {
    if (busy || photos.length === 0) return
    setBusy(true)
    setProgress({ done: 0, total: photos.length })
    try {
      const included = await downloadPhotosAsZip(photos, zipFilename, (done, total) =>
        setProgress({ done, total })
      )
      if (included === 0) {
        toast.error('Could not download those photos — try again.')
      } else if (included < photos.length) {
        toast.success(`Downloaded ${included} of ${photos.length} photos (some couldn't be fetched).`)
      } else {
        toast.success(`Downloaded ${included} photo${included === 1 ? '' : 's'}.`)
      }
    } catch {
      toast.error('Could not build the zip — try again.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy || photos.length === 0}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-surface-700 text-surface-400 hover:border-surface-500 hover:bg-surface-800 transition-all disabled:opacity-60"
      title={`Download all ${photos.length} photos as a zip`}
    >
      {busy ? (
        <>
          <Loader2 size={13} className="animate-spin" />
          {progress ? `Zipping ${progress.done}/${progress.total}…` : 'Zipping…'}
        </>
      ) : (
        <>
          <Download size={13} />
          {label} ({photos.length})
        </>
      )}
    </button>
  )
}
