import { jsPDF, GState } from 'jspdf'

// Palette copied from tailwind.config.js / the old worker/src/reportHtml.ts,
// so the client-generated PDF still matches the portal's branding.
const BRAND_900: [number, number, number] = [61, 47, 99]
const BRAND_700: [number, number, number] = [95, 71, 156]
const BRAND_100: [number, number, number] = [236, 227, 250]
const BRAND_50: [number, number, number] = [246, 242, 253]
const FOREST_500: [number, number, number] = [58, 122, 82]
const FOREST_600: [number, number, number] = [34, 87, 58]
const FOREST_50: [number, number, number] = [231, 240, 234]
const PENDING_AMBER: [number, number, number] = [175, 109, 40]
const ORANGE_600: [number, number, number] = [199, 106, 28]
const GREEN_600: [number, number, number] = [61, 130, 95]
const RED_600: [number, number, number] = [188, 62, 52]
const GRAY_500: [number, number, number] = [115, 115, 120]
const GRAY_300: [number, number, number] = [199, 199, 204]
const INK: [number, number, number] = [31, 29, 41]
const ZEBRA: [number, number, number] = [246, 244, 250]
const WHITE: [number, number, number] = [255, 255, 255]
const TINT_PENDING: [number, number, number] = [253, 246, 234]
const TINT_FLAGGED: [number, number, number] = [252, 240, 230]
const TINT_REJECTED: [number, number, number] = [250, 236, 233]
const SAMPLE_GRAY: [number, number, number] = [222, 216, 234]

export interface ReportColumn {
  header: string
  width: number
  align?: 'left' | 'right'
}

export interface ReportStat {
  label: string
  value: string
  tone?: 'default' | 'income' | 'expense' | 'net'
}

export interface ReportTable {
  title: string
  columns: ReportColumn[]
  rows: string[][]
  emptyMessage: string
  footerLines?: string[]
  rowTones?: (string | undefined)[]
  statusColumnIndex?: number
  caption?: string
}

export interface PhotoOfTheYear {
  dataUrl?: string
  caption?: string
  credit?: string
}

export interface SignatoryLine {
  role: string
  name?: string
}

export interface SecurityInfo {
  shortCode: string
  qrDataUrl: string
}

export interface SectionReportOptions {
  sectionName: string
  reportTitle: string
  periodLabel: string
  preparedBy?: string
  generatedAt: number
  logoDataUrl?: string
  stats: ReportStat[]
  tables: ReportTable[]
  photoOfTheYear?: PhotoOfTheYear
  signatories?: SignatoryLine[]
  /** Omit for sample exports — draws a SAMPLE watermark and no QR instead. */
  security?: SecurityInfo
}

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 15
const CONTENT_W = PAGE_W - MARGIN * 2
const HEADER_RESERVE = 22
const FOOTER_RESERVE = 17

function fmtDateTime(ts: number) {
  return new Date(ts).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2])
}
function setText(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2])
}
function setDraw(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2])
}

/** Uppercase label with a touch of letter-spacing — reads much more "printed" than tight caps. */
function spacedText(doc: jsPDF, text: string, x: number, y: number, opts?: { align?: 'left' | 'center' | 'right'; space?: number }) {
  doc.setCharSpace(opts?.space ?? 0.25)
  doc.text(text, x, y, opts?.align ? { align: opts.align } : undefined)
  doc.setCharSpace(0)
}

/**
 * Draws a logo/photo with a thin rounded frame behind it. jsPDF's
 * roundedRect+clip combo leaves the clip path unterminated in some builds
 * (corrupts the whole content stream), so instead of clipping the image
 * itself we just frame it — visually close enough and completely safe.
 */
function drawFramedImage(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number, radius: number, format: 'PNG' | 'JPEG' = 'PNG') {
  try {
    setFill(doc, WHITE)
    setDraw(doc, BRAND_100)
    doc.setLineWidth(0.3)
    doc.roundedRect(x - 0.6, y - 0.6, w + 1.2, h + 1.2, radius, radius, 'FD')
    doc.addImage(dataUrl, format, x, y, w, h)
  } catch {
    // Bad/unsupported image data — skip silently, never fail the export over decoration.
  }
}

/** Flat drop-shadow: a soft offset tint rect behind the card, since jsPDF has no native blur. */
function cardShadow(doc: jsPDF, x: number, y: number, w: number, h: number, radius: number) {
  setFill(doc, [223, 217, 236])
  doc.roundedRect(x + 0.6, y + 0.8, w, h, radius, radius, 'F')
}

function toneRowBg(tone?: string): [number, number, number] | null {
  if (tone === 'pending') return TINT_PENDING
  if (tone === 'flagged') return TINT_FLAGGED
  if (tone === 'rejected') return TINT_REJECTED
  return null
}
function toneTextColor(tone?: string): [number, number, number] {
  if (tone === 'approved') return GREEN_600
  if (tone === 'pending') return PENDING_AMBER
  if (tone === 'flagged') return ORANGE_600
  if (tone === 'rejected') return RED_600
  return INK
}
function statColor(tone?: ReportStat['tone']): [number, number, number] {
  if (tone === 'income') return GREEN_600
  if (tone === 'expense') return RED_600
  if (tone === 'net') return BRAND_900
  return INK
}

function truncate(doc: jsPDF, text: string, maxWidth: number, size: number): string {
  doc.setFontSize(size)
  if (doc.getTextWidth(text) <= maxWidth) return text
  let out = text
  while (out.length > 1 && doc.getTextWidth(out + '\u2026') > maxWidth) out = out.slice(0, -1)
  return out + '\u2026'
}

/** Section header bar with a forest-green flag on the left edge and letter-spaced caps. */
function sectionBar(doc: jsPDF, label: string, y: number): number {
  // A thin rule above the bar so section breaks still read clearly when
  // the colored fill turns to flat gray on a black & white printer.
  setDraw(doc, GRAY_300)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  y += 3

  setFill(doc, BRAND_900)
  doc.roundedRect(MARGIN, y, CONTENT_W, 8.2, 1.4, 1.4, 'F')
  setFill(doc, FOREST_500)
  doc.rect(MARGIN, y, 2.4, 8.2, 'F')
  setText(doc, WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  spacedText(doc, label.toUpperCase(), MARGIN + 6.5, y + 5.6)
  return y + 8.2 + 4.5
}

function statCards(doc: jsPDF, stats: ReportStat[], y: number): number {
  if (!stats.length) return y
  const gap = 3
  const w = (CONTENT_W - gap * (stats.length - 1)) / stats.length
  const h = 21
  stats.forEach((s, i) => {
    const x = MARGIN + i * (w + gap)
    cardShadow(doc, x, y, w, h, 1.8)
    setFill(doc, BRAND_50)
    setDraw(doc, BRAND_100)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, y, w, h, 1.8, 1.8, 'FD')
    setFill(doc, FOREST_500)
    doc.rect(x, y, 1.3, h, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.8)
    setText(doc, GRAY_500)
    spacedText(doc, s.label.toUpperCase(), x + 4.2, y + 7.2, { space: 0.15 })
    doc.setFontSize(11.5)
    setText(doc, statColor(s.tone))
    doc.text(truncate(doc, s.value, w - 6, 11.5), x + 4.2, y + 16)
  })
  return y + h + 6.5
}

function drawTableHeaderRow(doc: jsPDF, table: ReportTable, colWidths: number[], y: number): number {
  const rowH = 7.2
  setFill(doc, BRAND_700)
  doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
  setFill(doc, FOREST_500)
  doc.rect(MARGIN, y + rowH - 0.6, CONTENT_W, 0.6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  setText(doc, WHITE)
  let cx = MARGIN
  table.columns.forEach((col, i) => {
    const w = colWidths[i]
    const label = col.header.toUpperCase()
    const tw = doc.getTextWidth(label) + label.length * 0.15
    const tx = col.align === 'right' ? cx + w - tw - 2 : cx + 2
    spacedText(doc, label, tx, y + rowH - 2.6, { space: 0.15 })
    cx += w
  })
  return y + rowH
}

function drawEmptyState(doc: jsPDF, message: string, y: number): number {
  const h = 17
  setDraw(doc, GRAY_300)
  setFill(doc, BRAND_50)
  doc.setLineWidth(0.25)
  doc.setLineDashPattern([1.6, 1.3], 0)
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, 'FD')
  doc.setLineDashPattern([], 0)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  setText(doc, GRAY_500)
  doc.text(message, PAGE_W / 2, y + h / 2 + 1.5, { align: 'center' })
  return y + h + 5
}

function drawTableFooter(doc: jsPDF, lines: string[], y: number): number {
  // Courier, not helvetica: these lines stack (Income / Expense / Net) and
  // need their digits — and the padded colons before them — to land in the
  // same fixed-width columns from line to line.
  doc.setFont('courier', 'bold')
  doc.setFontSize(8.5)
  const maxLineW = Math.max(...lines.map((l) => doc.getTextWidth(l)))
  const boxW = Math.min(Math.max(maxLineW + 12, 62), CONTENT_W)
  const boxH = lines.length * 5.4 + 5
  const boxX = MARGIN + CONTENT_W - boxW
  const boxY = y + 2
  setFill(doc, BRAND_50)
  setDraw(doc, BRAND_100)
  doc.setLineWidth(0.25)
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.6, 1.6, 'FD')
  setFill(doc, FOREST_500)
  doc.rect(boxX, boxY, 1.3, boxH, 'F')
  let ly = boxY + 6
  lines.forEach((line) => {
    const isNet = /net/i.test(line)
    setText(doc, isNet ? BRAND_900 : INK)
    doc.setFontSize(isNet ? 9 : 8.5)
    const tw = doc.getTextWidth(line)
    doc.text(line, boxX + boxW - 4 - tw, ly)
    ly += 5.4
  })
  return boxY + boxH + 6
}

function drawTable(doc: jsPDF, table: ReportTable, startY: number, startNewPage: () => number): number {
  let y = sectionBar(doc, table.title, startY)
  if (table.caption) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    setText(doc, GRAY_500)
    doc.text(table.caption, MARGIN, y, { maxWidth: CONTENT_W })
    y += 5
  }

  const totalUnits = table.columns.reduce((s, c) => s + c.width, 0)
  const scale = CONTENT_W / totalUnits
  const colWidths = table.columns.map((c) => c.width * scale)
  const rowH = 6.2

  y = drawTableHeaderRow(doc, table, colWidths, y)

  if (table.rows.length === 0) {
    y = drawEmptyState(doc, table.emptyMessage, y)
  } else {
    table.rows.forEach((row, i) => {
      if (y + rowH > PAGE_H - MARGIN - FOOTER_RESERVE) {
        y = startNewPage()
        y = sectionBar(doc, `${table.title} (cont.)`, y)
        y = drawTableHeaderRow(doc, table, colWidths, y)
      }
      const tone = table.rowTones?.[i]
      const tint = toneRowBg(tone)
      setFill(doc, tint ?? (i % 2 === 0 ? ZEBRA : WHITE))
      doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')

      let cx = MARGIN
      doc.setFontSize(7.5)
      row.forEach((cell, c) => {
        const col = table.columns[c]
        const w = colWidths[c]
        const isStatus = table.statusColumnIndex === c
        // Right-aligned columns are numeric (amounts, counts) — a monospace
        // face keeps digits in fixed-width columns so they line up down
        // the page instead of drifting with helvetica's proportional widths.
        const family = col.align === 'right' ? 'courier' : 'helvetica'
        doc.setFont(family, isStatus && tone && tone !== 'approved' ? 'bold' : 'normal')
        setText(doc, isStatus ? toneTextColor(tone) : INK)
        const text = truncate(doc, cell ?? '', w - 4, 7.5)
        const tw = doc.getTextWidth(text)
        const tx = col.align === 'right' ? cx + w - tw - 2 : cx + 2
        doc.text(text, tx, y + rowH - 2)
        cx += w
      })
      y += rowH
    })
    setDraw(doc, GRAY_300)
    doc.setLineWidth(0.15)
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  }

  if (table.footerLines?.length) {
    y = drawTableFooter(doc, table.footerLines, y)
  } else {
    y += 6
  }

  return y
}

function drawVerificationPanel(doc: jsPDF, x: number, y: number, w: number, security?: SecurityInfo) {
  const h = 44
  cardShadow(doc, x, y, w, h, 2.2)
  setDraw(doc, security ? FOREST_500 : GRAY_300)
  setFill(doc, security ? FOREST_50 : BRAND_50)
  doc.setLineWidth(security ? 0.4 : 0.25)
  if (!security) doc.setLineDashPattern([1.6, 1.3], 0)
  doc.roundedRect(x, y, w, h, 2.2, 2.2, security ? 'FD' : 'FD')
  doc.setLineDashPattern([], 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.3)
  setText(doc, security ? FOREST_600 : GRAY_500)
  spacedText(doc, security ? 'VERIFY THIS REPORT' : 'SAMPLE EXPORT', x + w / 2, y + 6, { align: 'center', space: 0.2 })

  if (security) {
    const qrSize = 24
    const qrX = x + (w - qrSize) / 2
    const qrY = y + 8.5
    try {
      doc.addImage(security.qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    } catch {
      // QR image failed to embed — the printed code below still works as a fallback.
    }
    doc.setFont('courier', 'bold')
    doc.setFontSize(8)
    setText(doc, BRAND_900)
    doc.text(security.shortCode, x + w / 2, qrY + qrSize + 5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.6)
    setText(doc, GRAY_500)
    doc.text('Scan or enter this code online', x + w / 2, qrY + qrSize + 9.5, { align: 'center', maxWidth: w - 6 })
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.8)
    setText(doc, GRAY_500)
    doc.text('Sample exports are not sealed and carry no verification QR or code.', x + w / 2, y + h / 2 + 4, {
      align: 'center',
      maxWidth: w - 10,
    })
  }
}

// ── Physical (print) security features — signatory page only ───────────
// The QR/short code above prove authenticity when scanned, but a stapled,
// mailed, or filed printout gets photocopied without anyone scanning
// anything. A faint tiled ghost watermark and a seal are the fallback: a
// duplicated page tends to look visibly "off" next to a genuine one on
// the shelf, even offline.
const WATERMARK_TINT: [number, number, number] = [234, 230, 246]

/** Faint tiled ghost text across the whole page — subtle on the genuine printout, but flattens or moirés under most copiers/scanners, so a duplicate reads as visibly different from the original. */
function drawWatermarkTile(doc: jsPDF, sectionName: string, top: number, bottom: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  setText(doc, WATERMARK_TINT)
  const label = sectionName.toUpperCase()
  const stepX = 44
  const stepY = 19
  let row = 0
  for (let ry = top + 8; ry < bottom; ry += stepY, row++) {
    const offset = row % 2 === 0 ? 0 : stepX / 2
    for (let rx = MARGIN - 14 + offset; rx < PAGE_W - MARGIN + 14; rx += stepX) {
      doc.text(label, rx, ry, { angle: 35 })
    }
  }
  setText(doc, INK)
}

/** Seal: the section logo set inside a ringed circle, like a stamp/emblem — plain rings if no logo is available. */
function drawOfficialSeal(doc: jsPDF, cx: number, cy: number, r: number, logoDataUrl: string | undefined, caption: string, valid: boolean) {
  const ringColor = valid ? FOREST_500 : GRAY_300
  const inkColor = valid ? BRAND_900 : GRAY_500

  setFill(doc, WHITE)
  doc.circle(cx, cy, r, 'F')
  setDraw(doc, ringColor)
  doc.setLineWidth(0.55)
  doc.circle(cx, cy, r)
  doc.setLineWidth(0.25)
  doc.circle(cx, cy, r - 2.2)

  if (logoDataUrl) {
    const logoSize = (r - 3) * 1.3
    try {
      doc.addImage(logoDataUrl, 'PNG', cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)
    } catch {
      // Bad/unsupported image data — leave the plain ringed circle.
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(4.4)
  doc.setCharSpace(0.35)
  setText(doc, inkColor)
  doc.text(caption.toUpperCase(), cx, cy + r + 6, { align: 'center', maxWidth: r * 2.4 })
  doc.setCharSpace(0)
  setText(doc, INK)
}

/**
 * Builds the branded "Section Report" PDF entirely in the browser with
 * jsPDF — works on desktop and mobile alike, no headless-Chrome Worker
 * needed. Visual language (colors, section bars, tone-tinted rows, stat
 * cards) mirrors the old worker/src/reportHtml.ts template; layout is
 * hand-drawn since jsPDF has no HTML/CSS layout engine.
 */
export async function buildSectionReportPdf(opts: SectionReportOptions): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  function drawRunningHeader() {
    const logoSize = 8
    const hasLogo = !!opts.logoDataUrl
    if (hasLogo) drawFramedImage(doc, opts.logoDataUrl as string, MARGIN, 4.5, logoSize, logoSize, 1.8)
    const textX = hasLogo ? MARGIN + logoSize + 3 : MARGIN

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    setText(doc, BRAND_900)
    spacedText(doc, opts.sectionName.toUpperCase(), textX, 9, { space: 0.15 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    setText(doc, GRAY_500)
    doc.text(opts.reportTitle, textX, 13.2)

    const genLabel = `GENERATED ${fmtDateTime(opts.generatedAt).toUpperCase()}`
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.8)
    setText(doc, GRAY_500)
    doc.setCharSpace(0.1)
    const genW = doc.getTextWidth(genLabel) + genLabel.length * 0.1
    doc.text(genLabel, PAGE_W - MARGIN - genW, 9)
    doc.setCharSpace(0)

    setDraw(doc, FOREST_500)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, 17.5, PAGE_W - MARGIN, 17.5)
    setDraw(doc, BRAND_100)
    doc.setLineWidth(0.25)
    doc.line(MARGIN, 18.6, PAGE_W - MARGIN, 18.6)
    doc.setLineWidth(0.2)
  }

  function startNewPage(): number {
    doc.addPage()
    drawRunningHeader()
    return MARGIN + HEADER_RESERVE
  }

  // ── Cover / letterhead ──────────────────────────────────────────────
  drawRunningHeader()
  let y = MARGIN + HEADER_RESERVE

  // Sample watermark has to go behind the cover-page content, not after
  // it — draw it here, before the letterhead/stats/table are placed, so
  // it reads as a background wash instead of painting solid glyphs on
  // top of real text (which is what happened when this was drawn last).
  if (!opts.security) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(70)
    setText(doc, SAMPLE_GRAY)
    doc.text('SAMPLE', PAGE_W / 2, PAGE_H / 2, { align: 'center', angle: 35 })
    setText(doc, INK)
  }

  const letterheadH = 44
  cardShadow(doc, MARGIN, y, CONTENT_W, letterheadH, 2.5)
  setFill(doc, BRAND_50)
  setDraw(doc, BRAND_100)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, CONTENT_W, letterheadH, 2.5, 2.5, 'FD')
  setFill(doc, FOREST_500)
  doc.rect(MARGIN, y, 2, letterheadH, 'F')

  const padX = MARGIN + 9
  let ly = y + 10
  if (opts.logoDataUrl) {
    drawFramedImage(doc, opts.logoDataUrl, padX, ly - 6, 20, 20, 4)
  }
  const titleX = opts.logoDataUrl ? padX + 26 : padX

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setText(doc, BRAND_700)
  spacedText(doc, opts.sectionName.toUpperCase(), titleX, ly - 2, { space: 0.3 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  setText(doc, BRAND_900)
  doc.text(opts.reportTitle, titleX, ly + 7)
  setFill(doc, FOREST_500)
  doc.rect(titleX, ly + 10, 22, 0.7, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setText(doc, GRAY_500)
  doc.text(opts.periodLabel, titleX, ly + 17)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.8)
  doc.text(opts.preparedBy ? `Prepared by ${opts.preparedBy}` : 'Prepared by the Officer Portal', titleX, ly + 22.5)

  y += letterheadH + 8

  if (opts.stats.length) {
    y = sectionBar(doc, 'Overview', y)
    y = statCards(doc, opts.stats, y)
  }

  // ── Tables ───────────────────────────────────────────────────────────
  for (const table of opts.tables) {
    if (y > PAGE_H - MARGIN - FOOTER_RESERVE - 30) y = startNewPage()
    y = drawTable(doc, table, y, startNewPage)
  }

  // ── Photo of the Year ────────────────────────────────────────────────
  if (opts.photoOfTheYear) {
    y = startNewPage()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    setText(doc, BRAND_900)
    doc.text('Photo of the Year', PAGE_W / 2, y + 10, { align: 'center' })
    setFill(doc, FOREST_500)
    doc.rect(PAGE_W / 2 - 13, y + 14, 26, 0.7, 'F')
    const frameY = y + 24
    const frameH = 148
    setDraw(doc, BRAND_100)
    doc.setLineWidth(0.6)
    doc.rect(MARGIN + 16, frameY - 4, CONTENT_W - 32, frameH + 8)
    setDraw(doc, FOREST_500)
    doc.setLineWidth(0.35)
    doc.rect(MARGIN + 19, frameY - 1, CONTENT_W - 38, frameH + 2)
    doc.setLineWidth(0.2)
    if (opts.photoOfTheYear.dataUrl) {
      try {
        doc.addImage(opts.photoOfTheYear.dataUrl, 'JPEG', MARGIN + 21, frameY + 1, CONTENT_W - 42, frameH - 2, undefined, 'MEDIUM')
      } catch {
        drawPhotoPlaceholder(doc, frameY, frameH)
      }
    } else {
      drawPhotoPlaceholder(doc, frameY, frameH)
    }
    let capY = frameY + frameH + 12
    if (opts.photoOfTheYear.caption) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10.5)
      setText(doc, INK)
      doc.text(opts.photoOfTheYear.caption, PAGE_W / 2, capY, { align: 'center', maxWidth: CONTENT_W - 40 })
      capY += 6
    }
    if (opts.photoOfTheYear.credit) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      setText(doc, GRAY_500)
      doc.text(opts.photoOfTheYear.credit, PAGE_W / 2, capY, { align: 'center' })
    }
  }

  // ── Signatures + verification ───────────────────────────────────────
  if (opts.signatories?.length) {
    y = startNewPage()

    // Physical security dressing for this page — see the block above
    // `buildSectionReportPdf`. Drawn before everything else so the
    // watermark sits behind the real content.
    drawWatermarkTile(doc, opts.sectionName, y, PAGE_H - MARGIN - FOOTER_RESERVE)

    y = sectionBar(doc, 'Approved and Certified By', y)
    y += 4
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    setText(doc, GRAY_500)
    doc.text(
      'By signing below, each signatory confirms this report has been reviewed and reflects an accurate record.',
      MARGIN,
      y,
      { maxWidth: CONTENT_W }
    )
    y += 16

    const sigGap = 6
    const sigW = (CONTENT_W - sigGap * (opts.signatories.length - 1)) / opts.signatories.length
    opts.signatories.forEach((s, i) => {
      const x = MARGIN + i * (sigW + sigGap)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      setText(doc, INK)
      doc.text(s.name || ' ', x + sigW / 2, y, { align: 'center' })
      setFill(doc, FOREST_500)
      doc.rect(x + 3, y + 3.3, sigW - 6, 0.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.8)
      setText(doc, BRAND_700)
      spacedText(doc, s.role.toUpperCase(), x + sigW / 2, y + 8.5, { align: 'center', space: 0.2 })
    })
    y += 22

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setText(doc, GRAY_500)
    doc.text('Date signed: _______________________', MARGIN, y)
    y += 8

    const noteW = CONTENT_W - 64 - 8
    const certText =
      "This report has been reviewed for accuracy and is certified as a true and complete record of the section's activities and finances for the period covered above."
    const noteLines = doc.splitTextToSize(certText, noteW - 8)
    const noteH = noteLines.length * 4.2 + 8
    const panelH = 44
    const rowH = Math.max(noteH, panelH)

    setFill(doc, BRAND_50)
    setDraw(doc, BRAND_100)
    doc.setLineWidth(0.25)
    doc.roundedRect(MARGIN, y, noteW, rowH, 2, 2, 'FD')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.6)
    setText(doc, GRAY_500)
    doc.text(noteLines, MARGIN + 5, y + 6)

    drawVerificationPanel(doc, MARGIN + noteW + 8, y, CONTENT_W - noteW - 8, opts.security)

    y += rowH + 14

    // Official seal + document control number — the printed-page analog
    // of the QR/short code above, meant to be checked by eye rather than
    // scanned.
    const sealR = 15
    const sealCX = PAGE_W / 2
    const sealCY = y + sealR
    drawOfficialSeal(
      doc,
      sealCX,
      sealCY,
      sealR,
      opts.logoDataUrl,
      opts.security ? 'Official Document' : 'Specimen \u2014 Not Valid',
      !!opts.security
    )

    doc.setFont('courier', 'normal')
    doc.setFontSize(6.2)
    setText(doc, opts.security ? GRAY_500 : GRAY_300)
    const controlLabel = opts.security
      ? `Document Control No.  MTP-${opts.security.shortCode}-${new Date(opts.generatedAt).getFullYear()}`
      : 'Document Control No.  MTP-SAMPLE-\u2014\u2014\u2014\u2014'
    doc.text(controlLabel, sealCX, sealCY + sealR + 9, { align: 'center' })

    y = sealCY + sealR + 14
  }

  // ── Footer on every page ────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)

    // Faint logo watermark in the footer corner, drawn first so the text
    // below layers on top of it. Makes a lone page identifiable as ours
    // even pulled out of the stack, without competing with the footer text.
    if (opts.logoDataUrl) {
      const wmSize = 11
      const wmX = PAGE_W - MARGIN - wmSize + 1
      const wmY = PAGE_H - MARGIN - 12.5
      try {
        doc.saveGraphicsState()
        doc.setGState(new GState({ opacity: 0.12 }))
        doc.addImage(opts.logoDataUrl, 'PNG', wmX, wmY, wmSize, wmSize)
      } catch {
        // Bad/unsupported image data — footer still reads fine without it.
      } finally {
        doc.restoreGraphicsState()
      }
    }

    setDraw(doc, FOREST_500)
    doc.setLineWidth(0.4)
    doc.line(MARGIN, PAGE_H - MARGIN - 11, PAGE_W - MARGIN, PAGE_H - MARGIN - 11)
    doc.setLineWidth(0.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    setText(doc, GRAY_500)
    doc.text('Matipid Officer Portal \u00b7 Confidential \u2014 for internal section use only', MARGIN, PAGE_H - MARGIN - 5.5)
    const pageLabel = `Page ${p} of ${pageCount}`
    const tw = doc.getTextWidth(pageLabel)
    doc.text(pageLabel, PAGE_W - MARGIN - tw, PAGE_H - MARGIN - 5.5)

    if (opts.security) {
      doc.setFont('courier', 'bold')
      doc.setFontSize(6.2)
      setText(doc, FOREST_600)
      doc.text(`Verification code: ${opts.security.shortCode}`, MARGIN, PAGE_H - MARGIN - 1)
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      setText(doc, GRAY_300)
      doc.text('SAMPLE \u2014 not a verified document', MARGIN, PAGE_H - MARGIN - 1)
    }
  }

  // ── Cover-page QR / watermark ────────────────────────────────────────
  doc.setPage(1)
  if (opts.security) {
    const qrSize = 20
    const qrX = PAGE_W - MARGIN - qrSize
    const qrY = MARGIN + HEADER_RESERVE
    setFill(doc, WHITE)
    setDraw(doc, FOREST_500)
    doc.setLineWidth(0.3)
    doc.roundedRect(qrX - 2.5, qrY - 2.5, qrSize + 5, qrSize + 8.5, 1.8, 1.8, 'FD')
    try {
      doc.addImage(opts.security.qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.5)
      setText(doc, GRAY_500)
      doc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' })
    } catch {
      // QR image failed to embed — the printed verification code still works as a fallback.
    }
  }

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer)
}

function drawPhotoPlaceholder(doc: jsPDF, frameY: number, frameH: number) {
  setDraw(doc, GRAY_300)
  setFill(doc, BRAND_50)
  doc.setLineDashPattern([2, 1], 0)
  doc.rect(MARGIN + 20, frameY, CONTENT_W - 40, frameH, 'FD')
  doc.setLineDashPattern([], 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  setText(doc, GRAY_500)
  doc.text('PHOTO PLACEHOLDER', PAGE_W / 2, frameY + frameH / 2, { align: 'center' })
}
