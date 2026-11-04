/**
 * Utility to reliably trigger printing inside iframe preview sandboxes and popups
 * Supports A4 portrait and A4 landscape for optimal fitting of single-page work orders,
 * including 100% full-bleed high-res original work order sheets and delivery receipts.
 */
export function printElementById(elementId: string, orientation: 'portrait' | 'landscape' = 'portrait') {
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
      const printWin = window.open('', '_blank', 'width=1100,height=900,scrollbars=yes');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
            <head>
              <meta charset="utf-8">
              <title>مصنع النجار فيرنتشر</title>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @page {
                  size: A4 ${orientation};
                  margin: ${orientation === 'landscape' ? '3mm 5mm' : '4mm 6mm'};
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  box-sizing: border-box !important;
                }
                html, body {
                  font-family: 'Cairo', 'Tajawal', sans-serif !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  direction: rtl !important;
                  width: 100% !important;
                  height: 100% !important;
                  overflow: hidden !important;
                }
                .print-container {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  page-break-after: avoid !important;
                  page-break-before: avoid !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  font-size: ${orientation === 'landscape' ? '12px' : '13px'} !important;
                  line-height: 1.3 !important;
                }
                /* Ensure single page fit for digital card and delivery receipts */
                #printable-workshop-card, #printable-delivery-receipt, #printable-job-order-sheet {
                  border: 2px solid #000 !important;
                  box-shadow: none !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  padding: ${orientation === 'landscape' ? '6px 10px' : '10px 14px'} !important;
                  page-break-after: avoid !important;
                  page-break-before: avoid !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                .text-blue-900, .text-blue-950 { color: #002266 !important; }
                .text-emerald-800, .text-emerald-950 { color: #064e3b !important; }
                .text-red-600 { color: #cc0000 !important; }
                .text-amber-800 { color: #884400 !important; }
                .no-print { display: none !important; }
                
                /* Standard embedded thumbnails vs 100% Full Sheet Images */
                img {
                  max-height: ${orientation === 'landscape' ? '120px' : '180px'} !important;
                  object-fit: contain !important;
                  page-break-inside: avoid !important;
                }
                img.full-sheet-img {
                  max-height: none !important;
                  height: auto !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  object-fit: contain !important;
                  display: block !important;
                  margin: 0 auto !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              </style>
            </head>
            <body>
              <div class="print-container">
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
            <title>مصنع النجار فيرنتشر</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: A4 ${orientation}; margin: 4mm 6mm; }
              body { font-family: 'Cairo', sans-serif !important; background: #fff !important; color: #000 !important; direction: rtl !important; overflow: hidden !important; }
              .text-blue-900, .text-blue-950 { color: #002266 !important; }
              .text-emerald-800, .text-emerald-950 { color: #064e3b !important; }
              .text-red-600 { color: #cc0000 !important; }
              .text-amber-800 { color: #884400 !important; }
              .no-print { display: none !important; }
              #printable-workshop-card, #printable-delivery-receipt, #printable-job-order-sheet {
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              img { max-height: 180px; object-fit: contain; }
              img.full-sheet-img { max-height: none !important; width: 100% !important; height: auto !important; object-fit: contain !important; }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 210mm; margin: 0 auto; page-break-inside: avoid;">
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
