/**
 * Utility to export table data to PDF format
 * Uses a simple approach: creates a string representation and lets browser handle download
 */

export function exportTableToPdf(
  fileName: string,
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const timestamp = new Date().toLocaleString('id-ID')
  const csvContent = [
    `"SafetyHub Data Export"`,
    `"${title}"`,
    `"Generated: ${timestamp}"`,
    '',
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${fileName}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportTableToHtml(
  fileName: string,
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const timestamp = new Date().toLocaleString('id-ID')
  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 20px;
    }
    h1 {
      color: #0f172a;
      font-size: 24px;
      margin-bottom: 5px;
    }
    .meta {
      color: #64748b;
      font-size: 12px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #f1f5f9;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e2e8f0;
      color: #1e293b;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Generated: ${timestamp}</div>
  <table>
    <thead>
      <tr>
        ${headers.map((h) => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
  <script>
    window.print();
    window.onafterprint = () => window.close();
  </script>
</body>
</html>
  `.trim()

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${fileName}.html`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Also open print window for direct printing
  const printWindow = window.open(url, `print-${fileName}`, 'height=500,width=900')
  if (printWindow) {
    printWindow.document.write(html)
  }
}
