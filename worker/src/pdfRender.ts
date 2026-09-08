import puppeteer from '@cloudflare/puppeteer'
import type { Env } from './types'

export interface PdfRunningHeader {
  sectionName: string
  reportTitle: string
  generatedAt: number
}

function escHeader(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDateTime(ts: number) {
  return new Date(ts).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

/**
 * Renders an HTML string to a PDF using Cloudflare's Browser Rendering
 * binding (real headless Chrome) instead of hand-drawing pages with
 * pdf-lib. This is what makes the Section Report look like an actual
 * document — real typography, native table pagination, proper margins —
 * instead of manually placed text boxes.
 *
 * `header`, when provided, renders a small branded running header (section
 * name + report title + generated timestamp) on every page, matching the
 * old pdf-lib version. Omit it for documents that don't need one.
 *
 * Free-plan note: Workers Free includes 10 minutes of browser usage per
 * day and a 60s browser timeout, which is comfortably enough for an
 * officer occasionally exporting a report. If usage ever needs to scale
 * up, that's a Workers Paid plan setting, not a code change here.
 */
export async function renderPdfFromHtml(env: Env, html: string, header?: PdfRunningHeader): Promise<Uint8Array> {
  const browser = await puppeteer.launch(env.BROWSER)
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: header ? '26mm' : '10mm', bottom: '18mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: header ? buildHeaderTemplate(header) : '<span></span>',
      footerTemplate: FOOTER_TEMPLATE,
    })

    return pdf
  } finally {
    await browser.close()
  }
}

// Puppeteer header/footer templates are isolated fragments — no access to
// the page's own <style>, so every rule has to be inline.
function buildHeaderTemplate(header: PdfRunningHeader): string {
  return `
<div style="width:100%; font-family: Helvetica, Arial, sans-serif; padding: 8px 14mm 0; display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid #ece3fa;">
  <div>
    <div style="font-size:9px; font-weight:700; color:#3d2f63;">${escHeader(header.sectionName)}</div>
    <div style="font-size:7px; color:#8a8a90; margin-top:1px;">${escHeader(header.reportTitle)}</div>
  </div>
  <div style="font-size:7px; color:#8a8a90;">Generated ${escHeader(fmtDateTime(header.generatedAt))}</div>
</div>`
}

const FOOTER_TEMPLATE = `
<div style="width:100%; font-family: Helvetica, Arial, sans-serif; font-size:7px; color:#8a8a90; padding: 0 14mm 8px; display:flex; justify-content:space-between; border-top:1px solid #d9d9de;">
  <span>Matipid Officer Portal &middot; Confidential &mdash; for internal section use only</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`
