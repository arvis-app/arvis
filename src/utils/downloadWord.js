import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'

// Parse inline formatting: **bold**, plain text
function parseInline(text, baseOpts = {}) {
  const runs = []
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, ...baseOpts }))
    } else if (part) {
      runs.push(new TextRun({ text: part, ...baseOpts }))
    }
  }
  return runs
}

// Convert HTML element to docx paragraphs
function htmlToDocx(el) {
  const paragraphs = []
  const children = el.childNodes

  for (const node of children) {
    if (node.nodeType === 3) {
      // Text node
      const t = node.textContent.trim()
      if (t) paragraphs.push(new Paragraph({ children: parseInline(t, { size: 22, font: 'Arial' }) }))
      continue
    }
    if (node.nodeType !== 1) continue

    const tag = node.tagName.toLowerCase()

    // Headings
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level = tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3
      paragraphs.push(new Paragraph({
        heading: level,
        children: [new TextRun({ text: node.textContent, bold: true, size: tag === 'h1' ? 28 : tag === 'h2' ? 26 : 24, font: 'Arial' })],
        spacing: { before: 240, after: 120 }
      }))
    }
    // Tables
    else if (tag === 'table') {
      const rows = []
      node.querySelectorAll('tr').forEach((tr, ri) => {
        const cells = []
        tr.querySelectorAll('td,th').forEach(td => {
          cells.push(new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: td.textContent.trim(), bold: ri === 0, size: 20, font: 'Arial' })]
            })],
            width: { size: 3000, type: WidthType.DXA }
          }))
        })
        if (cells.length) rows.push(new TableRow({ children: cells }))
      })
      if (rows.length) {
        paragraphs.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          }
        }))
      }
    }
    // Lists
    else if (tag === 'ul' || tag === 'ol') {
      node.querySelectorAll('li').forEach(li => {
        paragraphs.push(new Paragraph({
          children: parseInline(li.textContent, { size: 22, font: 'Arial' }),
          bullet: { level: 0 },
          spacing: { after: 60 }
        }))
      })
    }
    // Horizontal rule
    else if (tag === 'hr') {
      paragraphs.push(new Paragraph({ children: [], spacing: { before: 200, after: 200 } }))
    }
    // Paragraphs, divs, strong, em, spans — recurse or inline
    else if (tag === 'p' || tag === 'div') {
      const text = node.textContent.trim()
      if (!text) {
        paragraphs.push(new Paragraph({ children: [], spacing: { after: 120 } }))
      } else {
        // Check if this div has bold styling (used by Scan results for section titles)
        const isBold = node.style?.fontWeight >= 700 || node.style?.fontWeight === 'bold' || tag === 'strong'
        const fontSize = parseInt(node.style?.fontSize) || 11
        const isTitle = isBold && fontSize >= 14
        const isIndented = parseInt(node.style?.marginLeft) > 0
        paragraphs.push(new Paragraph({
          children: parseInline(text, { size: isTitle ? 26 : 22, font: 'Arial', bold: isBold }),
          spacing: { before: isTitle ? 200 : 0, after: isTitle ? 100 : 60 },
          ...(isIndented ? { indent: { left: 360 } } : {})
        }))
      }
    }
    // Strong/bold at top level
    else if (tag === 'strong' || tag === 'b') {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: node.textContent, bold: true, size: 22, font: 'Arial' })]
      }))
    }
    // br — empty line
    else if (tag === 'br') {
      // skip, handled by parent
    }
    // Fallback
    else {
      const t = node.textContent.trim()
      if (t) paragraphs.push(new Paragraph({ children: parseInline(t, { size: 22, font: 'Arial' }) }))
    }
  }
  return paragraphs
}

export async function downloadAsWord(contenu, filename) {
  let paragraphs

  // If called with an HTML element ID, parse HTML for formatting
  const el = document.getElementById('aiSummaryDiv')
  if (el && filename === 'KI-Analyse') {
    paragraphs = htmlToDocx(el)
  } else {
    // Fallback: plain text (OCR mode)
    paragraphs = contenu.split('\n').map(line =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 22, font: 'Arial' })]
      })
    )
  }

  if (!paragraphs.length) return

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }]
  })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename + '.docx'
  a.click()
  URL.revokeObjectURL(url)
}
