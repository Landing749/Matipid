import { useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2 } from 'lucide-react'
import { generateSectionReport, REAL_REPORT_STEPS, SAMPLE_REPORT_STEPS } from '@/lib/sectionReport'
import { ReportGenerationOverlay } from '@/components/ReportGenerationOverlay'

/**
 * Exports the fully branded "Section Report" PDF — section logo, events
 * with attendance, and the financial summary in one document — the way an
 * officer would hand it to advisers or the next batch during turnover.
 * Built entirely client-side with jsPDF (see src/lib/sectionReport.ts) so
 * it works the same on mobile as on desktop, with no Worker round-trip.
 *
 * Real exports also register a verification record in RTDB and print a
 * QR + short code on the document, so anyone who scans it lands on
 * /verify/:reportId and sees whether it's still the current version — see
 * src/lib/reportVerification.ts and src/pages/public/VerifyReport.tsx.
 *
 * The "Download sample" link next to it produces the same template filled
 * with fixed placeholder data (and "Sample" in place of any name that
 * would otherwise come from live config) — lets an officer see the full
 * layout, including the closing photo page and signature page, before any
 * real events, finance records, photo, or signatories are set up. Samples
 * carry no verification record and print a SAMPLE watermark instead of a QR.
 */
export function SectionReportButton() {
  const [busy, setBusy] = useState<'real' | 'sample' | null>(null)
  const [stepIndex, setStepIndex] = useState(0)

  async function run(sample: boolean) {
    setBusy(sample ? 'sample' : 'real')
    setStepIndex(0)
    try {
      await generateSectionReport({ sample, onStep: setStepIndex })
      toast.success(sample ? 'Sample report downloaded.' : 'Section report downloaded.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Report export failed.')
    } finally {
      setBusy(null)
    }
  }

  const steps = busy === 'sample' ? SAMPLE_REPORT_STEPS : REAL_REPORT_STEPS

  return (
    <div className="inline-flex items-center gap-2.5">
      <button
        onClick={() => run(false)}
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-brand-700 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
        title="Export a fully branded PDF report: events, attendance, and finances — with a scannable verification QR"
      >
        {busy === 'real' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        Export Section Report
      </button>
      <button
        onClick={() => run(true)}
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-brand-700 hover:bg-brand-700/10 transition-colors disabled:opacity-50"
        title="Preview the report template with placeholder data — no live events, finances, photo, or signatories needed"
      >
        {busy === 'sample' ? <Loader2 size={12} className="animate-spin" /> : null}
        Download sample
      </button>
      <ReportGenerationOverlay open={!!busy} step={stepIndex} steps={steps} />
    </div>
  )
}
