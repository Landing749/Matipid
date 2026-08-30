import { useState } from 'react'
import { toast } from 'sonner'
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import { downloadExport, type ExportFilters, type ExportKind } from '@/lib/worker'

export function ExportButtons({ kind, filters }: { kind: ExportKind; filters?: ExportFilters }) {
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null)

  async function handle(format: 'pdf' | 'xlsx') {
    setBusy(format)
    try {
      await downloadExport(kind, format, filters)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handle('pdf')}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-surface-700 text-surface-300 hover:border-brand-500 hover:text-brand-500 transition-colors disabled:opacity-50"
        title="Export as PDF"
      >
        {busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        PDF
      </button>
      <button
        onClick={() => handle('xlsx')}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-surface-700 text-surface-300 hover:border-clay-500 hover:text-clay-600 transition-colors disabled:opacity-50"
        title="Export as Excel"
      >
        {busy === 'xlsx' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
        Excel
      </button>
    </div>
  )
}
