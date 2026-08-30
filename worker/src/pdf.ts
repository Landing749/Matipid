import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export interface Column {
  header: string
  width: number
  align?: 'left' | 'right'
}

export interface TablePdfOptions {
  sectionName: string
  reportTitle: string
  subtitle?: string
  generatedAt: number
  columns: Column[]
  rows: string[][]
  summaryLines?: string[]
}

const PAGE_WIDTH = 841.89 // A4 landscape
const PAGE_HEIGHT = 595.28
const MARGIN = 40
const ROW_HEIGHT = 20
const HEADER_HEIGHT = 24

function fmtDate(ts: number) {
  return new Date(ts).toISOString().slice(0, 16).replace('T', ' ')
}

export async function buildTablePdf(opts: TablePdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const tableWidth = opts.columns.reduce((s, c) => s + c.width, 0)
  const startX = (PAGE_WIDTH - tableWidth) / 2 > MARGIN ? (PAGE_WIDTH - tableWidth) / 2 : MARGIN

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN
  let pageNum = 1

  function drawHeaderBlock(p: PDFPage) {
    p.drawText(opts.sectionName, { x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: 9, font: bold, color: rgb(0.45, 0.35, 0.65) })
    p.drawText(opts.reportTitle, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 18, size: 16, font: bold, color: rgb(0.1, 0.1, 0.12) })
    if (opts.subtitle) {
      p.drawText(opts.subtitle, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 34, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
    }
    p.drawText(`Generated ${fmtDate(opts.generatedAt)}`, {
      x: PAGE_WIDTH - MARGIN - 160,
      y: PAGE_HEIGHT - MARGIN,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  function drawTableHeader(p: PDFPage, atY: number) {
    p.drawRectangle({
      x: startX,
      y: atY - HEADER_HEIGHT,
      width: tableWidth,
      height: HEADER_HEIGHT,
      color: rgb(0.29, 0.22, 0.42),
    })
    let cx = startX
    for (const col of opts.columns) {
      const textX = col.align === 'right' ? cx + col.width - font.widthOfTextAtSize(col.header, 8) - 6 : cx + 6
      p.drawText(col.header, { x: textX, y: atY - HEADER_HEIGHT + 8, size: 8, font: bold, color: rgb(1, 1, 1) })
      cx += col.width
    }
    return atY - HEADER_HEIGHT
  }

  function truncate(text: string, maxWidth: number, size: number, f: PDFFont) {
    if (f.widthOfTextAtSize(text, size) <= maxWidth) return text
    let out = text
    while (out.length > 1 && f.widthOfTextAtSize(out + '…', size) > maxWidth) {
      out = out.slice(0, -1)
    }
    return out + '…'
  }

  drawHeaderBlock(page)
  y = PAGE_HEIGHT - MARGIN - 50
  y = drawTableHeader(page, y)

  opts.rows.forEach((row, i) => {
    if (y - ROW_HEIGHT < MARGIN + 30) {
      // footer + page break
      page.drawText(`Page ${pageNum}`, { x: PAGE_WIDTH / 2 - 20, y: MARGIN - 15, size: 8, font, color: rgb(0.5, 0.5, 0.5) })
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      pageNum++
      y = PAGE_HEIGHT - MARGIN
      y = drawTableHeader(page, y)
    }

    if (i % 2 === 0) {
      page.drawRectangle({ x: startX, y: y - ROW_HEIGHT, width: tableWidth, height: ROW_HEIGHT, color: rgb(0.96, 0.95, 0.98) })
    }

    let cx = startX
    for (let c = 0; c < opts.columns.length; c++) {
      const col = opts.columns[c]
      const cell = truncate(row[c] ?? '', col.width - 10, 8, font)
      const textX = col.align === 'right' ? cx + col.width - font.widthOfTextAtSize(cell, 8) - 6 : cx + 6
      page.drawText(cell, { x: textX, y: y - ROW_HEIGHT + 6, size: 8, font, color: rgb(0.15, 0.15, 0.15) })
      cx += col.width
    }
    y -= ROW_HEIGHT
  })

  if (opts.summaryLines?.length) {
    y -= 16
    for (const line of opts.summaryLines) {
      if (y < MARGIN + 20) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        pageNum++
        y = PAGE_HEIGHT - MARGIN
      }
      page.drawText(line, { x: startX, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.12) })
      y -= 16
    }
  }

  page.drawText(`Page ${pageNum}`, { x: PAGE_WIDTH / 2 - 20, y: MARGIN - 15, size: 8, font, color: rgb(0.5, 0.5, 0.5) })

  return doc.save()
}
