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
                /* Ensure single page fit for digital card, delivery receipts, and truck manifest */
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

                /* Dedicated single-page fit for Truck Manifest with Adaptive Full-Height Auto-Scale */
                #printable-truck-manifest {
                  border: 2px solid #000 !important;
                  box-shadow: none !important;
                  max-width: 100% !important;
                  width: 100% !important;
                  margin: 0 auto !important;
                  box-sizing: border-box !important;
                  page-break-after: avoid !important;
                  page-break-before: avoid !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  min-height: ${orientation === 'landscape' ? '195mm' : '272mm'} !important;
                  height: 100% !important;
                }
                #printable-truck-manifest .manifest-content-wrapper {
                  flex: 1 1 auto !important;
                  display: flex !important;
                  flex-direction: column !important;
                }
                #printable-truck-manifest .manifest-table-wrapper {
                  flex: 1 1 auto !important;
                  display: flex !important;
                  flex-direction: column !important;
                }
                #printable-truck-manifest table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  height: 100% !important;
                  flex: 1 1 auto !important;
                }
                #printable-truck-manifest tbody {
                  height: 100% !important;
                }
                #printable-truck-manifest th {
                  background-color: #fff200 !important;
                  color: #000000 !important;
                  font-weight: 900 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                #printable-truck-manifest td {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                #printable-truck-manifest .manifest-footer {
                  margin-top: auto !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }

                #printable-report {
                  background: #ffffff !important;
                  color: #000000 !important;
                  padding: 10mm !important;
                  width: 100% !important;
                  box-sizing: border-box !important;
                }
                #printable-report table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                }
                #printable-report th {
                  background-color: #fef08a !important;
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  font-weight: 900 !important;
                }
                #printable-report td, #printable-report th {
                  border: 1px solid #94a3b8 !important;
                  padding: 6px 8px !important;
                  font-size: 11px !important;
                }

                /* 1. Spacious Density (1-4 items): Large font, tall rows, fills the entire page */
                #printable-truck-manifest.density-spacious {
                  padding: 6mm 7mm !important;
                }
                #printable-truck-manifest.density-spacious th {
                  font-size: 15px !important;
                  padding: 10px 8px !important;
                }
                #printable-truck-manifest.density-spacious td {
                  font-size: 14px !important;
                  padding: 12px 8px !important;
                  line-height: 1.4 !important;
                }
                #printable-truck-manifest.density-spacious .manifest-header-block div {
                  padding: 6px 8px !important;
                  font-size: 14px !important;
                }
                #printable-truck-manifest.density-spacious .manifest-brand-title {
                  font-size: 22px !important;
                }
                #printable-truck-manifest.density-spacious .manifest-footer {
                  padding-top: 14px !important;
                  font-size: 13px !important;
                }

                /* 2. Comfortable Density (5-8 items): Medium-large fonts and balanced filling */
                #printable-truck-manifest.density-comfortable {
                  padding: 4mm 6mm !important;
                }
                #printable-truck-manifest.density-comfortable th {
                  font-size: 12.5px !important;
                  padding: 6px 6px !important;
                }
                #printable-truck-manifest.density-comfortable td {
                  font-size: 12px !important;
                  padding: 7px 6px !important;
                  line-height: 1.3 !important;
                }
                #printable-truck-manifest.density-comfortable .manifest-header-block div {
                  padding: 4px 6px !important;
                  font-size: 12px !important;
                }
                #printable-truck-manifest.density-comfortable .manifest-brand-title {
                  font-size: 18px !important;
                }
                #printable-truck-manifest.density-comfortable .manifest-footer {
                  padding-top: 8px !important;
                  font-size: 11.5px !important;
                }

                /* 3. Balanced Density (9-13 items): Standard Factory Sheet */
                #printable-truck-manifest.density-balanced {
                  padding: 3mm 4mm !important;
                }
                #printable-truck-manifest.density-balanced th {
                  font-size: 11px !important;
                  padding: 3.5px 4px !important;
                }
                #printable-truck-manifest.density-balanced td {
                  font-size: 10.5px !important;
                  padding: 3.5px 4px !important;
                  line-height: 1.2 !important;
                }
                #printable-truck-manifest.density-balanced .manifest-header-block div {
                  padding: 2.5px 4px !important;
                  font-size: 11px !important;
                }
                #printable-truck-manifest.density-balanced .manifest-brand-title {
                  font-size: 16px !important;
                }
                #printable-truck-manifest.density-balanced .manifest-footer {
                  padding-top: 4px !important;
                  font-size: 10px !important;
                }

                /* 4. Compact Density (14-17 items or heavy text) */
                #printable-truck-manifest.density-compact {
                  padding: 2.5mm 3.5mm !important;
                }
                #printable-truck-manifest.density-compact th {
                  font-size: 9.5px !important;
                  padding: 2px 3px !important;
                }
                #printable-truck-manifest.density-compact td {
                  font-size: 9px !important;
                  padding: 2px 3px !important;
                  line-height: 1.15 !important;
                }
                #printable-truck-manifest.density-compact .manifest-header-block div {
                  padding: 1.5px 3px !important;
                  font-size: 9.5px !important;
                }
                #printable-truck-manifest.density-compact .manifest-brand-title {
                  font-size: 14px !important;
                }
                #printable-truck-manifest.density-compact .manifest-footer {
                  padding-top: 2px !important;
                  font-size: 9px !important;
                }

                /* 5. Micro Density (18+ items or extreme text) */
                #printable-truck-manifest.density-micro {
                  padding: 2mm 3mm !important;
                }
                #printable-truck-manifest.density-micro th {
                  font-size: 8.5px !important;
                  padding: 1.5px 2px !important;
                }
                #printable-truck-manifest.density-micro td {
                  font-size: 8px !important;
                  padding: 1.5px 2px !important;
                  line-height: 1.1 !important;
                }
                #printable-truck-manifest.density-micro .manifest-header-block div {
                  padding: 1px 2px !important;
                  font-size: 8.5px !important;
                }
                #printable-truck-manifest.density-micro .manifest-brand-title {
                  font-size: 13px !important;
                }
                #printable-truck-manifest.density-micro .manifest-footer {
                  padding-top: 1.5px !important;
                  font-size: 8px !important;
                }

                /* Dedicated single-page fit for Customer Delivery Receipt with Adaptive Full-Height Auto-Scale */
                #printable-delivery-receipt {
                  border: 2px solid #000 !important;
                  box-sizing: border-box !important;
                  page-break-after: avoid !important;
                  page-break-before: avoid !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  min-height: ${orientation === 'landscape' ? '195mm' : '272mm'} !important;
                  height: 100% !important;
                }
                #printable-delivery-receipt.density-spacious {
                  padding: 7mm 8mm !important;
                  font-size: 13.5px !important;
                  line-height: 1.4 !important;
                }
                #printable-delivery-receipt.density-spacious .receipt-brand-title { font-size: 24px !important; }
                #printable-delivery-receipt.density-spacious .receipt-product-title { font-size: 15px !important; }
                #printable-delivery-receipt.density-spacious .receipt-specs-grid { font-size: 13px !important; }
                #printable-delivery-receipt.density-spacious .receipt-notes-lines { min-height: 28px !important; }

                #printable-delivery-receipt.density-comfortable {
                  padding: 5mm 6mm !important;
                  font-size: 12.5px !important;
                  line-height: 1.35 !important;
                }
                #printable-delivery-receipt.density-comfortable .receipt-brand-title { font-size: 21px !important; }
                #printable-delivery-receipt.density-comfortable .receipt-product-title { font-size: 13.5px !important; }
                #printable-delivery-receipt.density-comfortable .receipt-specs-grid { font-size: 12px !important; }
                #printable-delivery-receipt.density-comfortable .receipt-notes-lines { min-height: 22px !important; }

                #printable-delivery-receipt.density-balanced {
                  padding: 4mm 5mm !important;
                  font-size: 11.5px !important;
                  line-height: 1.25 !important;
                }
                #printable-delivery-receipt.density-balanced .receipt-brand-title { font-size: 19px !important; }
                #printable-delivery-receipt.density-balanced .receipt-product-title { font-size: 12.5px !important; }
                #printable-delivery-receipt.density-balanced .receipt-specs-grid { font-size: 11px !important; }
                #printable-delivery-receipt.density-balanced .receipt-notes-lines { min-height: 16px !important; }

                #printable-delivery-receipt.density-compact {
                  padding: 3mm 4mm !important;
                  font-size: 10px !important;
                  line-height: 1.2 !important;
                }
                #printable-delivery-receipt.density-compact .receipt-brand-title { font-size: 16px !important; }
                #printable-delivery-receipt.density-compact .receipt-product-title { font-size: 11px !important; }
                #printable-delivery-receipt.density-compact .receipt-specs-grid { font-size: 10px !important; }
                #printable-delivery-receipt.density-compact .receipt-notes-lines { min-height: 12px !important; }

                #printable-delivery-receipt.density-micro {
                  padding: 2mm 3mm !important;
                  font-size: 9px !important;
                  line-height: 1.15 !important;
                }
                #printable-delivery-receipt.density-micro .receipt-brand-title { font-size: 14px !important; }
                #printable-delivery-receipt.density-micro .receipt-product-title { font-size: 9.5px !important; }
                #printable-delivery-receipt.density-micro .receipt-specs-grid { font-size: 8.5px !important; }
                #printable-delivery-receipt.density-micro .receipt-notes-lines { min-height: 8px !important; }

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
              #printable-workshop-card, #printable-delivery-receipt, #printable-job-order-sheet, #printable-report {
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              #printable-report table { width: 100% !important; border-collapse: collapse !important; }
              #printable-report th { background-color: #fef08a !important; color: #000 !important; font-weight: 900 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              #printable-report td, #printable-report th { border: 1px solid #94a3b8 !important; padding: 6px 8px !important; font-size: 11px !important; }
              #printable-truck-manifest {
                border: 2px solid #000 !important;
                box-sizing: border-box !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                min-height: ${orientation === 'landscape' ? '195mm' : '272mm'} !important;
                height: 100% !important;
              }
              #printable-truck-manifest .manifest-content-wrapper {
                flex: 1 1 auto !important;
                display: flex !important;
                flex-direction: column !important;
              }
              #printable-truck-manifest .manifest-table-wrapper {
                flex: 1 1 auto !important;
                display: flex !important;
                flex-direction: column !important;
              }
              #printable-truck-manifest table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                height: 100% !important;
                flex: 1 1 auto !important;
              }
              #printable-truck-manifest th {
                background-color: #fff200 !important;
                color: #000 !important;
                font-weight: 900 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-truck-manifest td {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-truck-manifest.density-spacious { padding: 6mm 7mm !important; }
              #printable-truck-manifest.density-spacious th { font-size: 15px !important; padding: 10px 8px !important; }
              #printable-truck-manifest.density-spacious td { font-size: 14px !important; padding: 12px 8px !important; line-height: 1.4 !important; }
              #printable-truck-manifest.density-spacious .manifest-brand-title { font-size: 22px !important; }
              #printable-truck-manifest.density-spacious .manifest-footer { padding-top: 14px !important; font-size: 13px !important; }

              #printable-truck-manifest.density-comfortable { padding: 4mm 6mm !important; }
              #printable-truck-manifest.density-comfortable th { font-size: 12.5px !important; padding: 6px 6px !important; }
              #printable-truck-manifest.density-comfortable td { font-size: 12px !important; padding: 7px 6px !important; line-height: 1.3 !important; }
              #printable-truck-manifest.density-comfortable .manifest-brand-title { font-size: 18px !important; }
              #printable-truck-manifest.density-comfortable .manifest-footer { padding-top: 8px !important; font-size: 11.5px !important; }

              #printable-truck-manifest.density-balanced { padding: 3mm 4mm !important; }
              #printable-truck-manifest.density-balanced th { font-size: 11px !important; padding: 3.5px 4px !important; }
              #printable-truck-manifest.density-balanced td { font-size: 10.5px !important; padding: 3.5px 4px !important; line-height: 1.2 !important; }
              #printable-truck-manifest.density-balanced .manifest-brand-title { font-size: 16px !important; }
              #printable-truck-manifest.density-balanced .manifest-footer { padding-top: 4px !important; font-size: 10px !important; }

              #printable-truck-manifest.density-compact { padding: 2.5mm 3.5mm !important; }
              #printable-truck-manifest.density-compact th { font-size: 9.5px !important; padding: 2px 3px !important; }
              #printable-truck-manifest.density-compact td { font-size: 9px !important; padding: 2px 3px !important; line-height: 1.15 !important; }
              #printable-truck-manifest.density-compact .manifest-brand-title { font-size: 14px !important; }
              #printable-truck-manifest.density-compact .manifest-footer { padding-top: 2px !important; font-size: 9px !important; }

              #printable-truck-manifest.density-micro { padding: 2mm 3mm !important; }
              #printable-truck-manifest.density-micro th { font-size: 8.5px !important; padding: 1.5px 2px !important; }
              #printable-truck-manifest.density-micro td { font-size: 8px !important; padding: 1.5px 2px !important; line-height: 1.1 !important; }
              #printable-truck-manifest.density-micro .manifest-brand-title { font-size: 13px !important; }
              #printable-delivery-receipt {
                border: 2px solid #000 !important;
                box-sizing: border-box !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                min-height: ${orientation === 'landscape' ? '195mm' : '272mm'} !important;
                height: 100% !important;
              }
              #printable-delivery-receipt.density-spacious { padding: 7mm 8mm !important; font-size: 13.5px !important; line-height: 1.4 !important; }
              #printable-delivery-receipt.density-spacious .receipt-brand-title { font-size: 24px !important; }
              #printable-delivery-receipt.density-spacious .receipt-product-title { font-size: 15px !important; }
              #printable-delivery-receipt.density-spacious .receipt-specs-grid { font-size: 13px !important; }
              #printable-delivery-receipt.density-spacious .receipt-notes-lines { min-height: 28px !important; }

              #printable-delivery-receipt.density-comfortable { padding: 5mm 6mm !important; font-size: 12.5px !important; line-height: 1.35 !important; }
              #printable-delivery-receipt.density-comfortable .receipt-brand-title { font-size: 21px !important; }
              #printable-delivery-receipt.density-comfortable .receipt-product-title { font-size: 13.5px !important; }
              #printable-delivery-receipt.density-comfortable .receipt-specs-grid { font-size: 12px !important; }
              #printable-delivery-receipt.density-comfortable .receipt-notes-lines { min-height: 22px !important; }

              #printable-delivery-receipt.density-balanced { padding: 4mm 5mm !important; font-size: 11.5px !important; line-height: 1.25 !important; }
              #printable-delivery-receipt.density-balanced .receipt-brand-title { font-size: 19px !important; }
              #printable-delivery-receipt.density-balanced .receipt-product-title { font-size: 12.5px !important; }
              #printable-delivery-receipt.density-balanced .receipt-specs-grid { font-size: 11px !important; }
              #printable-delivery-receipt.density-balanced .receipt-notes-lines { min-height: 16px !important; }

              #printable-delivery-receipt.density-compact { padding: 3mm 4mm !important; font-size: 10px !important; line-height: 1.2 !important; }
              #printable-delivery-receipt.density-compact .receipt-brand-title { font-size: 16px !important; }
              #printable-delivery-receipt.density-compact .receipt-product-title { font-size: 11px !important; }
              #printable-delivery-receipt.density-compact .receipt-specs-grid { font-size: 10px !important; }
              #printable-delivery-receipt.density-compact .receipt-notes-lines { min-height: 12px !important; }

              #printable-delivery-receipt.density-micro { padding: 2mm 3mm !important; font-size: 9px !important; line-height: 1.15 !important; }
              #printable-delivery-receipt.density-micro .receipt-brand-title { font-size: 14px !important; }
              #printable-delivery-receipt.density-micro .receipt-product-title { font-size: 9.5px !important; }
              #printable-delivery-receipt.density-micro .receipt-specs-grid { font-size: 8.5px !important; }
              #printable-delivery-receipt.density-micro .receipt-notes-lines { min-height: 8px !important; }

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
