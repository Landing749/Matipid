import { SECTION_LOGO_MARK_PNG_BASE64 } from './assets/logoMark'

// currencyDisplay: 'code' (→ "PHP 1,234.50") instead of the default peso
// glyph "₱" — kept as "code" here too (not a font issue in HTML, just
// consistency with the rest of the exports so numbers read the same way
// across the Section Report, Finance export, and on-screen totals).
const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', currencyDisplay: 'code', minimumFractionDigits: 2 })

// Brand palette — copied from tailwind.config.js so the PDF matches the
// portal's UI exactly instead of an approximation.
const BRAND_900 = '#3d2f63'
const BRAND_800 = '#4c397d'
const BRAND_700 = '#5f479c'
const BRAND_100 = '#ece3fa'
const BRAND_50 = '#f6f2fd'
const GOLD_500 = '#cf8836'
const GOLD_600 = '#af6d28'
const ORANGE_600 = '#c76a1c' // warning tone for "flagged", distinct from pending/rejected
const GREEN_600 = '#3d825f'
const RED_600 = '#bc3e34'
const GRAY_500 = '#737378'
const GRAY_300 = '#c7c7cc'
const INK = '#1f1d29'
const ZEBRA = '#f6f4fa'
const ROW_TINT_PENDING = '#fdf6ea'
const ROW_TINT_FLAGGED = '#fcf0e6'
const ROW_TINT_REJECTED_HEX = '#faece9'

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
  /**
   * Index-aligned with `rows` — each row's raw status string (e.g.
   * "approved" | "pending" | "flagged" | "rejected"). When present, drives
   * a per-row background tint plus a bold, colored status cell so
   * non-approved rows stand out instead of blending in with plain text.
   */
  rowTones?: (string | undefined)[]
  /** Column index (within `columns`) whose text gets the tone color/weight. */
  statusColumnIndex?: number
  /** Small italic caption drawn under the section bar, before the table. */
  caption?: string
}

export interface PhotoOfTheYear {
  /** Raw image bytes — already fetched by the caller. Omit (along with
   * `imageType`) to draw a dashed placeholder box instead of a real photo
   * — used for the "Download Sample" preview. */
  imageBytes?: Uint8Array
  imageType?: 'png' | 'jpg'
  caption?: string
  credit?: string
}

export interface SignatoryLine {
  role: string
  name?: string
}

export interface SectionReportOptions {
  sectionName: string
  reportTitle: string
  periodLabel: string
  preparedBy?: string
  generatedAt: number
  stats: ReportStat[]
  tables: ReportTable[]
  photoOfTheYear?: PhotoOfTheYear
  signatories?: SignatoryLine[]
}

export function fmtSigned(amount: number, negative: boolean) {
  return (negative ? '-' : '+') + PHP.format(Math.abs(amount))
}

function fmtDateTime(ts: number) {
  return new Date(ts).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

function esc(s: string | number | undefined): string {
  if (s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toneRowBg(tone: string | undefined): string | undefined {
  if (tone === 'pending') return ROW_TINT_PENDING
  if (tone === 'flagged') return ROW_TINT_FLAGGED
  if (tone === 'rejected') return ROW_TINT_REJECTED_HEX
  return undefined
}

function toneTextColor(tone: string | undefined): string {
  if (tone === 'approved') return GREEN_600
  if (tone === 'pending') return GOLD_600
  if (tone === 'flagged') return ORANGE_600
  if (tone === 'rejected') return RED_600
  return INK
}

function statCardColor(tone: ReportStat['tone']): string {
  if (tone === 'income') return GREEN_600
  if (tone === 'expense') return RED_600
  if (tone === 'net') return BRAND_900
  return INK
}

/** Chunked to stay well under call-stack limits for large images. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function statCardsHtml(stats: ReportStat[]): string {
  if (stats.length === 0) return ''
  const cards = stats
    .map(
      (s) => `
      <div class="stat-card">
        <div class="stat-card-accent"></div>
        <div class="stat-card-body">
          <div class="stat-label">${esc(s.label.toUpperCase())}</div>
          <div class="stat-value" style="color:${statCardColor(s.tone)}">${esc(s.value)}</div>
        </div>
      </div>`
    )
    .join('')
  return `<div class="stats-grid" style="grid-template-columns: repeat(${stats.length}, 1fr);">${cards}</div>`
}

function tableHtml(table: ReportTable): string {
  const colgroup = `<colgroup>${table.columns.map((c) => `<col style="width:${c.width}px">`).join('')}</colgroup>`
  const thead = `<thead><tr>${table.columns
    .map((c) => `<th class="${c.align === 'right' ? 'align-right' : ''}">${esc(c.header)}</th>`)
    .join('')}</tr></thead>`

  let body: string
  if (table.rows.length === 0) {
    body = `<tbody><tr><td colspan="${table.columns.length}" class="empty-row">${esc(table.emptyMessage)}</td></tr></tbody>`
  } else {
    const rows = table.rows
      .map((row, i) => {
        const tone = table.rowTones?.[i]
        const tinted = toneRowBg(tone)
        const rowBg = tinted ?? (i % 2 === 0 ? ZEBRA : 'transparent')
        const cells = row
          .map((cell, c) => {
            const col = table.columns[c]
            const isStatusCol = table.statusColumnIndex === c
            const style = isStatusCol
              ? `color:${toneTextColor(tone)};${tone && tone !== 'approved' ? 'font-weight:700;' : ''}`
              : ''
            return `<td class="${col.align === 'right' ? 'align-right' : ''}" style="${style}">${esc(cell)}</td>`
          })
          .join('')
        return `<tr style="background:${rowBg}">${cells}</tr>`
      })
      .join('')
    body = `<tbody>${rows}</tbody>`
  }

  const footer = table.footerLines?.length
    ? `<div class="table-footer">${table.footerLines.map((l) => `<div class="table-footer-line">${esc(l)}</div>`).join('')}</div>`
    : ''

  return `
    <section class="table-section">
      <div class="section-bar">${esc(table.title.toUpperCase())}</div>
      ${table.caption ? `<div class="table-caption">${esc(table.caption)}</div>` : ''}
      <table>${colgroup}${thead}${body}</table>
      ${footer}
    </section>`
}

function photoPageHtml(photo: PhotoOfTheYear): string {
  const frame =
    photo.imageBytes && photo.imageType
      ? `<img class="photo-img" src="data:image/${photo.imageType === 'png' ? 'png' : 'jpeg'};base64,${bytesToBase64(photo.imageBytes)}" />`
      : `<div class="photo-placeholder">PHOTO PLACEHOLDER</div>`

  return `
    <section class="photo-page">
      <h2>Photo of the Year</h2>
      <div class="gold-rule"></div>
      <div class="photo-frame">${frame}</div>
      ${photo.caption ? `<div class="photo-caption">${esc(photo.caption)}</div>` : ''}
      ${photo.credit ? `<div class="photo-credit">${esc(photo.credit)}</div>` : ''}
    </section>`
}

function signaturesPageHtml(signatories: SignatoryLine[]): string {
  const blocks = signatories
    .map(
      (s) => `
      <div class="sign-block">
        <div class="sign-name">${s.name ? esc(s.name) : '&nbsp;'}</div>
        <div class="sign-line"></div>
        <div class="sign-role">${esc(s.role.toUpperCase())}</div>
      </div>`
    )
    .join('')

  return `
    <section class="sign-page">
      <div class="section-bar">APPROVED AND CERTIFIED BY</div>
      <div class="sign-row" style="margin-top:26px;">${blocks}</div>
      <div class="date-line">Date signed: _______________________</div>
      <p class="cert-note">This report has been reviewed for accuracy and is certified as a true and complete record
      of the section&rsquo;s activities and finances for the period covered above.</p>
    </section>`
}

/**
 * Builds the full branded "Section Report" as a standalone HTML document,
 * meant to be rendered to PDF with headless Chrome (see pdfRender.ts).
 * Real <table> elements repeat their <thead> across page breaks natively,
 * so pagination — the fiddliest part of the old pdf-lib version — is
 * handled by the browser instead of hand-rolled row-height math.
 */
export function buildSectionReportHtml(opts: SectionReportOptions): string {
  const logoDataUri = `data:image/png;base64,${SECTION_LOGO_MARK_PNG_BASE64}`

  const preparedByLine = opts.preparedBy ? `Prepared by ${opts.preparedBy}` : 'Prepared by the Officer Portal'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(opts.reportTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    color: ${INK};
    font-size: 9.5pt;
    line-height: 1.4;
  }

  .cover { margin-bottom: 8px; }
  .cover-top { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
  .cover-logo { width: 46px; height: 46px; border-radius: 10px; }
  .section-name { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: ${BRAND_700}; text-transform: uppercase; }
  .cover h1 { font-size: 24px; font-weight: 800; color: ${BRAND_900}; margin: 2px 0 0; }
  .cover-meta { margin-bottom: 20px; }
  .period-label { font-size: 12px; color: ${GRAY_500}; margin-bottom: 4px; }
  .prepared-by { font-size: 10px; color: ${GRAY_500}; font-style: italic; }

  .section-bar {
    background: ${BRAND_900};
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 7px 10px;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .stats-grid { display: grid; gap: 10px; margin-bottom: 22px; page-break-inside: avoid; }
  .stat-card {
    display: flex;
    background: ${BRAND_50};
    border: 1px solid ${BRAND_100};
    border-radius: 8px;
    overflow: hidden;
    min-height: 58px;
  }
  .stat-card-accent { width: 4px; background: ${GOLD_500}; flex-shrink: 0; }
  .stat-card-body { padding: 9px 10px; }
  .stat-label { font-size: 7px; font-weight: 700; letter-spacing: 0.06em; color: ${GRAY_500}; margin-bottom: 6px; }
  .stat-value { font-size: 14px; font-weight: 800; }

  .table-section { margin-bottom: 22px; }
  .table-caption { font-size: 8.5px; font-style: italic; color: ${GRAY_500}; margin: -3px 0 8px; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    background: ${BRAND_700};
    color: #fff;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-align: left;
    padding: 7px 8px;
  }
  th.align-right, td.align-right { text-align: right; }
  td {
    font-size: 8.5px;
    padding: 6px 8px;
    border-bottom: 1px solid #efeaf6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  td.empty-row { text-align: center; font-style: italic; color: ${GRAY_500}; padding: 16px 8px; white-space: normal; }

  .table-footer { margin-top: 8px; text-align: right; }
  .table-footer-line { font-size: 9.5px; font-weight: 700; color: ${BRAND_900}; font-variant-numeric: tabular-nums; }

  .photo-page { page-break-before: always; padding-top: 40px; text-align: center; }
  .photo-page h2 { font-size: 15px; font-weight: 800; color: ${BRAND_900}; margin: 0 0 10px; }
  .gold-rule { width: 60px; height: 2px; background: ${GOLD_500}; margin: 0 auto 22px; }
  .photo-frame { display: flex; align-items: center; justify-content: center; }
  .photo-img { max-width: 100%; max-height: 560px; border: 1px solid ${BRAND_100}; padding: 4px; background: #fff; }
  .photo-placeholder {
    width: 100%; height: 320px;
    border: 1.5px dashed ${GRAY_300};
    background: ${BRAND_50};
    display: flex; align-items: center; justify-content: center;
    color: ${GRAY_500}; font-weight: 700; font-size: 12px; letter-spacing: 0.04em;
  }
  .photo-caption { font-style: italic; font-size: 11px; margin-top: 16px; }
  .photo-credit { font-size: 8px; color: ${GRAY_500}; margin-top: 4px; }

  .sign-page { page-break-before: always; padding-top: 30px; }
  .sign-row { display: flex; gap: 24px; margin-bottom: 46px; }
  .sign-block { flex: 1; text-align: center; }
  .sign-name { font-size: 11px; font-weight: 700; margin-bottom: 30px; min-height: 14px; }
  .sign-line { border-top: 1px solid ${GRAY_300}; margin: 0 6px 8px; }
  .sign-role { font-size: 8.5px; letter-spacing: 0.05em; color: ${GRAY_500}; }
  .date-line { font-size: 9.5px; color: ${GRAY_500}; margin-bottom: 18px; }
  .cert-note { font-size: 8.5px; font-style: italic; color: ${GRAY_500}; max-width: 480px; margin: 0; }
</style>
</head>
<body>
  <section class="cover">
    <div class="cover-top">
      <img class="cover-logo" src="${logoDataUri}" />
      <div>
        <div class="section-name">${esc(opts.sectionName)}</div>
        <h1>${esc(opts.reportTitle)}</h1>
      </div>
    </div>
    <div class="cover-meta">
      <div class="period-label">${esc(opts.periodLabel)}</div>
      <div class="prepared-by">${esc(preparedByLine)}</div>
    </div>
    ${opts.stats.length ? `<div class="section-bar">OVERVIEW</div>${statCardsHtml(opts.stats)}` : ''}
  </section>

  ${opts.tables.map(tableHtml).join('')}
  ${opts.photoOfTheYear ? photoPageHtml(opts.photoOfTheYear) : ''}
  ${opts.signatories?.length ? signaturesPageHtml(opts.signatories) : ''}
</body>
</html>`
}
