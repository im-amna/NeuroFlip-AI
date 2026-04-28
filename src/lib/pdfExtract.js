export async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  
  const workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url
  ).toString()
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map(item => item.str).join(' ') + '\n'
  }

  return fullText
}