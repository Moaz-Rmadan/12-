/**
 * Utility to reliably trigger printing inside iframe preview sandboxes and popups
 */
export function printElementById(elementId: string) {
  try {
    const el = document.getElementById(elementId);
    if (!el) {
      console.warn('Element for printing not found:', elementId);
      window.print();
      return;
    }

    const htmlContent = el.outerHTML;

    // Strategy 1: Open isolated print popup window (works cleanly across browsers)
    try {
      const printWin = window.open('', '_blank', 'width=1000,height=900,scrollbars=yes');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
            <head>
              <meta charset="utf-8">
              <title>طباعة أمر الشغل - مصنع النجار ديزاين</title>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 8mm 10mm;
                }
                body {
                  font-family: 'Cairo', 'Tajawal', sans-serif !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 15px !important;
                  direction: rtl !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .text-blue-900, .text-blue-950 { color: #002266 !important; }
                .text-red-600 { color: #cc0000 !important; }
                .text-amber-800 { color: #884400 !important; }
                .no-print { display: none !important; }
                img { max-height: 220px; object-fit: contain; }
              </style>
            </head>
            <body>
              <div style="width: 100%; max-width: 210mm; margin: 0 auto;">
                ${htmlContent}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
        return;
      }
    } catch (popupErr) {
      console.warn('Popup print blocked or not supported, falling back to iframe', popupErr);
    }

    // Strategy 2: Create or reuse hidden print iframe inside current window
    let iframe = document.getElementById('print-iframe-sandbox') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-sandbox';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = '0px';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8">
            <title>أمر شغل - مصنع النجار ديزاين</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: A4 portrait; margin: 8mm 10mm; }
              body { font-family: 'Cairo', sans-serif !important; background: #fff !important; color: #000 !important; direction: rtl !important; }
              .text-blue-900, .text-blue-950 { color: #002266 !important; }
              .text-red-600 { color: #cc0000 !important; }
              .text-amber-800 { color: #884400 !important; }
              .no-print { display: none !important; }
              img { max-height: 220px; object-fit: contain; }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 210mm; margin: 0 auto;">
              ${htmlContent}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          window.print();
        }
      }, 500);
      return;
    }

    // Strategy 3: Direct window print fallback
    window.print();

  } catch (error) {
    console.error('Print helper error:', error);
    window.print();
  }
}
