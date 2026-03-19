import { Document, Packer, Paragraph, TextRun } from 'docx'

export async function downloadAsWord(contenu, filename) {
  const paragraphs = contenu.split('\n').map(line =>
    new Paragraph({
      children: [new TextRun({ text: line, size: 24, font: 'Arial' })]
    })
  )
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
