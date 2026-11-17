/**
 * Bulletproof A4 print utility for El-Naggar Furniture Factory.
 * Uses synchronous DOM portal isolation + native window.print() with automatic
 * detection of sandboxed-iframe print blocking (missing `allow-modals`),
 * offering 1-click standalone A4 export and new-tab opening without window.open/window.alert.
 */

export const PRINT_PORTAL_ID = 'print-portal-root';
export const DYNAMIC_PRINT_STYLE_ID = 'dynamic-print-style';
export const PRINTING_BODY_ATTR = 'data-printing-target';
export const PRINT_FALLBACK_BANNER_ID = 'print-fallback-banner';

let activeCleanupTimer: ReturnType<typeof setTimeout> | null = null;
let activeBlockedCheckTimer: ReturnType<typeof setTimeout> | null = null;
let activeAfterPrintHandler: (() => void) | null = null;
let activeBeforePrintHandler: (() => void) | null = null;

/**
 * Copies live runtime values from form elements in `source` to `clone`
 * because DOM `cloneNode(true)` does not preserve edited `.value`, `.checked`,
 * or `.selectedIndex` states that were not reflected back to HTML attributes.
 */
export function syncFormValuesToClone(source: HTMLElement, clone: HTMLElement): void {
  const srcInputs = source.querySelectorAll('input');
  const dstInputs = clone.querySelectorAll('input');
  srcInputs.forEach((srcEl, idx) => {
    const dstEl = dstInputs[idx];
    if (!dstEl) return;
    if (srcEl.type === 'checkbox' || srcEl.type === 'radio') {
      dstEl.checked = srcEl.checked;
      if (srcEl.checked) {
        dstEl.setAttribute('checked', 'checked');
      } else {
        dstEl.removeAttribute('checked');
      }
    } else {
      dstEl.value = srcEl.value;
      dstEl.setAttribute('value', srcEl.value);
    }
  });

  const srcTextareas = source.querySelectorAll('textarea');
  const dstTextareas = clone.querySelectorAll('textarea');
  srcTextareas.forEach((srcEl, idx) => {
    const dstEl = dstTextareas[idx];
    if (!dstEl) return;
    dstEl.value = srcEl.value;
    dstEl.textContent = srcEl.value;
  });

  const srcSelects = source.querySelectorAll('select');
  const dstSelects = clone.querySelectorAll('select');
  srcSelects.forEach((srcEl, idx) => {
    const dstEl = dstSelects[idx];
    if (!dstEl) return;
    dstEl.selectedIndex = srcEl.selectedIndex;
    Array.from(dstEl.options).forEach((opt, optIdx) => {
      if (optIdx === srcEl.selectedIndex) {
        opt.setAttribute('selected', 'selected');
      } else {
        opt.removeAttribute('selected');
      }
    });
  });
}

export function buildPrintIsolationCss(orientation: 'portrait' | 'landscape' = 'portrait'): string {
  const maxWidth = orientation === 'landscape' ? '285mm' : '210mm';
  const fullSheetMinHeight = orientation === 'landscape' ? '190mm' : '268mm';
  const fullSheetMaxHeight = orientation === 'landscape' ? '198mm' : '285mm';

  return `
    @media screen {
      #${PRINT_PORTAL_ID} {
        display: none !important;
      }
    }

    @media print {
      @page {
        size: A4 ${orientation};
        margin: 4mm 6mm;
      }

      html, body {
        font-family: 'Cairo', 'Tajawal', sans-serif !important;
        background: #ffffff !important;
        color: #000000 !important;
        direction: rtl !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        color-scheme: light !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body[${PRINTING_BODY_ATTR}="true"] > *:not(#${PRINT_PORTAL_ID}) {
        display: none !important;
      }

      #${PRINT_PORTAL_ID} {
        display: block !important;
        position: static !important;
        width: 100% !important;
        max-width: ${maxWidth} !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
      }

      #${PRINT_PORTAL_ID} .no-print {
        display: none !important;
      }

      #${PRINT_PORTAL_ID} .text-blue-900,
      #${PRINT_PORTAL_ID} .text-blue-950 {
        color: #002266 !important;
      }

      #${PRINT_PORTAL_ID} .text-emerald-800,
      #${PRINT_PORTAL_ID} .text-emerald-950 {
        color: #064e3b !important;
      }

      #${PRINT_PORTAL_ID} .text-red-600 {
        color: #cc0000 !important;
      }

      #${PRINT_PORTAL_ID} .text-amber-800 {
        color: #884400 !important;
      }

      #${PRINT_PORTAL_ID} #printable-workshop-card,
      #${PRINT_PORTAL_ID} #printable-delivery-receipt,
      #${PRINT_PORTAL_ID} #printable-job-order-sheet {
        box-shadow: none !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      #${PRINT_PORTAL_ID} #printable-report,
      #${PRINT_PORTAL_ID} #printable-top-models-report,
      #${PRINT_PORTAL_ID} #printable-bottleneck-report,
      #${PRINT_PORTAL_ID} #printable-isolated-stage-report,
      #${PRINT_PORTAL_ID} #printable-overdue-report,
      #${PRINT_PORTAL_ID} #printable-smart-search-report {
        box-shadow: none !important;
        width: 100% !important;
        max-width: 100% !important;
        background: #ffffff !important;
        color: #000000 !important;
      }

      #${PRINT_PORTAL_ID} #printable-report table,
      #${PRINT_PORTAL_ID} #printable-smart-search-report table,
      #${PRINT_PORTAL_ID} #printable-top-models-report table,
      #${PRINT_PORTAL_ID} #printable-bottleneck-report table,
      #${PRINT_PORTAL_ID} #printable-isolated-stage-report table,
      #${PRINT_PORTAL_ID} #printable-overdue-report table {
        width: 100% !important;
        border-collapse: collapse !important;
      }

      #${PRINT_PORTAL_ID} #printable-report th {
        background-color: #fef08a !important;
        color: #000000 !important;
        font-weight: 900 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #${PRINT_PORTAL_ID} #printable-report td,
      #${PRINT_PORTAL_ID} #printable-report th {
        border: 1px solid #94a3b8 !important;
        padding: 6px 8px !important;
        font-size: 11px !important;
      }

      /* Truck Manifest Single-Page A4 Layout */
      #${PRINT_PORTAL_ID} #printable-truck-manifest {
        border: 2px solid #000000 !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        min-height: ${fullSheetMinHeight} !important;
        max-height: ${fullSheetMaxHeight} !important;
        width: 100% !important;
        margin: 0 auto !important;
      }

      #${PRINT_PORTAL_ID} #printable-truck-manifest .manifest-content-wrapper,
      #${PRINT_PORTAL_ID} #printable-truck-manifest .manifest-table-wrapper {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
      }

      #${PRINT_PORTAL_ID} #printable-truck-manifest table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        height: 100% !important;
        flex: 1 1 auto !important;
      }

      #${PRINT_PORTAL_ID} #printable-truck-manifest th {
        background-color: #fff200 !important;
        color: #000000 !important;
        font-weight: 900 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #${PRINT_PORTAL_ID} #printable-truck-manifest td {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-spacious { padding: 6mm 7mm !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-spacious th { font-size: 15px !important; padding: 10px 8px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-spacious td { font-size: 14px !important; padding: 12px 8px !important; line-height: 1.4 !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-spacious .manifest-brand-title { font-size: 22px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-spacious .manifest-footer { padding-top: 14px !important; font-size: 13px !important; }

      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-comfortable { padding: 4mm 6mm !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-comfortable th { font-size: 12.5px !important; padding: 6px 6px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-comfortable td { font-size: 12px !important; padding: 7px 6px !important; line-height: 1.3 !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-comfortable .manifest-brand-title { font-size: 18px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-comfortable .manifest-footer { padding-top: 8px !important; font-size: 11.5px !important; }

      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-balanced { padding: 3mm 4mm !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-balanced th { font-size: 11px !important; padding: 3.5px 4px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-balanced td { font-size: 10.5px !important; padding: 3.5px 4px !important; line-height: 1.2 !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-balanced .manifest-brand-title { font-size: 16px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-balanced .manifest-footer { padding-top: 4px !important; font-size: 10px !important; }

      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-compact { padding: 2.5mm 3.5mm !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-compact th { font-size: 9.5px !important; padding: 2px 3px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-compact td { font-size: 9px !important; padding: 2px 3px !important; line-height: 1.15 !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-compact .manifest-brand-title { font-size: 14px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-compact .manifest-footer { padding-top: 2px !important; font-size: 9px !important; }

      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-micro { padding: 2mm 3mm !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-micro th { font-size: 8.5px !important; padding: 1.5px 2px !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-micro td { font-size: 8px !important; padding: 1.5px 2px !important; line-height: 1.1 !important; }
      #${PRINT_PORTAL_ID} #printable-truck-manifest.density-micro .manifest-brand-title { font-size: 13px !important; }

      /* Customer Delivery Receipt Single-Page A4 Layout */
      #${PRINT_PORTAL_ID} #printable-delivery-receipt {
        border: 2px solid #000000 !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        min-height: ${fullSheetMinHeight} !important;
        max-height: ${fullSheetMaxHeight} !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        background: #ffffff !important;
        color: #000000 !important;
      }

      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-spacious { padding: 7mm 8mm !important; font-size: 13.5px !important; line-height: 1.4 !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-spacious .receipt-brand-title { font-size: 24px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-spacious .receipt-product-title { font-size: 15px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-spacious .receipt-specs-grid { font-size: 13px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-spacious .receipt-notes-lines { min-height: 28px !important; }

      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-comfortable { padding: 5mm 6mm !important; font-size: 12.5px !important; line-height: 1.35 !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-comfortable .receipt-brand-title { font-size: 21px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-comfortable .receipt-product-title { font-size: 13.5px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-comfortable .receipt-specs-grid { font-size: 12px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-comfortable .receipt-notes-lines { min-height: 22px !important; }

      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-balanced { padding: 4mm 5mm !important; font-size: 11.5px !important; line-height: 1.25 !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-balanced .receipt-brand-title { font-size: 19px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-balanced .receipt-product-title { font-size: 12.5px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-balanced .receipt-specs-grid { font-size: 11px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-balanced .receipt-notes-lines { min-height: 16px !important; }

      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-compact { padding: 3mm 4mm !important; font-size: 10px !important; line-height: 1.2 !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-compact .receipt-brand-title { font-size: 16px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-compact .receipt-product-title { font-size: 11px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-compact .receipt-specs-grid { font-size: 10px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-compact .receipt-notes-lines { min-height: 12px !important; }

      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-micro { padding: 2mm 3mm !important; font-size: 9px !important; line-height: 1.15 !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-micro .receipt-brand-title { font-size: 14px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-micro .receipt-product-title { font-size: 9.5px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-micro .receipt-specs-grid { font-size: 8.5px !important; }
      #${PRINT_PORTAL_ID} #printable-delivery-receipt.density-micro .receipt-notes-lines { min-height: 8px !important; }

      #${PRINT_PORTAL_ID} img {
        max-height: 180px;
        object-fit: contain;
      }

      #${PRINT_PORTAL_ID} img.full-sheet-img {
        max-height: none !important;
        width: 100% !important;
        height: auto !important;
        object-fit: contain !important;
      }
    }
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collectCompiledAppStyles(): string {
  if (typeof document === 'undefined') return '';
  const chunks: string[] = [];
  const sheets = Array.from(document.styleSheets || []);
  for (const sheet of sheets) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      const cssText = Array.from(rules)
        .map((r) => r.cssText)
        .join('\n');
      if (cssText) chunks.push(cssText);
    } catch {
      // Cross-origin stylesheet (e.g. Google Fonts); preserved via <link>
    }
  }
  if (chunks.length === 0) {
    document.querySelectorAll('style').forEach((styleTag) => {
      if (styleTag.id !== DYNAMIC_PRINT_STYLE_ID && styleTag.textContent) {
        chunks.push(styleTag.textContent);
      }
    });
  }
  return chunks.join('\n');
}

export function buildStandalonePrintableHtml(
  elementId: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  title = 'إقرار استلام العميل - مصنع النجار فيرنتشر'
): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(elementId);
  if (!el) return null;

  const clone = el.cloneNode(true) as HTMLElement;
  syncFormValuesToClone(el, clone);
  clone.querySelectorAll('.no-print').forEach((node) => node.remove());

  const appStyles = collectCompiledAppStyles();
  const printRules = buildPrintIsolationCss(orientation)
    .replace(/@media screen\s*\{[\s\S]*?#print-portal-root\s*\{[\s\S]*?\}\s*\}/m, '');

  const maxWidth = orientation === 'landscape' ? '285mm' : '210mm';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
    <style>${appStyles}</style>
    <style>
      body {
        background: #e2e8f0;
        color: #000000;
        font-family: 'Cairo', 'Tajawal', sans-serif;
        margin: 0;
        padding: 16px;
        direction: rtl;
      }
      .standalone-toolbar {
        max-width: ${maxWidth};
        margin: 0 auto 16px auto;
        padding: 12px 16px;
        background: #16253B;
        color: #ffffff;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
        font-weight: 700;
      }
      .standalone-toolbar button {
        background: #fbbf24;
        color: #0f172a;
        border: 0;
        border-radius: 10px;
        padding: 8px 18px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
      }
      #${PRINT_PORTAL_ID} {
        max-width: ${maxWidth};
        margin: 0 auto;
        background: #ffffff;
      }
      @media print {
        body {
          background: #ffffff !important;
          padding: 0 !important;
        }
        .standalone-toolbar {
          display: none !important;
        }
      }
      ${printRules}
    </style>
  </head>
  <body>
    <div class="standalone-toolbar no-print">
      <span>نسخة الطباعة الجاهزة (A4) — ${escapeHtml(title)}</span>
      <button type="button" onclick="window.print()">طباعة / حفظ PDF الآن</button>
    </div>
    <div id="${PRINT_PORTAL_ID}" dir="rtl">
      ${clone.outerHTML}
    </div>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          try { window.print(); } catch (e) {}
        }, 250);
      });
    </script>
  </body>
</html>`;
}

export function downloadPrintableElementAsHtml(
  elementId: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  title = 'إقرار استلام العميل'
): boolean {
  const html = buildStandalonePrintableHtml(elementId, orientation, title);
  if (!html) return false;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeName = title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'printable-sheet';
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName}.html`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1500);
  return true;
}

export function dismissPrintFallbackBanner(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(PRINT_FALLBACK_BANNER_ID)?.remove();
}

export function showPrintFallbackBanner(
  elementId: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  title = 'إقرار استلام العميل'
): void {
  if (typeof document === 'undefined') return;
  dismissPrintFallbackBanner();

  const banner = document.createElement('div');
  banner.id = PRINT_FALLBACK_BANNER_ID;
  banner.className = 'no-print';
  banner.setAttribute('dir', 'rtl');
  banner.style.cssText = [
    'position: fixed',
    'bottom: 20px',
    'left: 50%',
    'transform: translateX(-50%)',
    'z-index: 99999',
    'width: min(94vw, 680px)',
    'background: #16253B',
    'color: #ffffff',
    'border: 2px solid #fbbf24',
    'border-radius: 18px',
    'padding: 16px 18px',
    'box-shadow: 0 20px 50px rgba(0,0,0,0.45)',
    "font-family: 'Cairo', 'Tajawal', sans-serif",
  ].join(';');

  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;';

  const textWrap = document.createElement('div');
  const heading = document.createElement('div');
  heading.textContent = 'نافذة المعاينة الحالية تمنع أمر الطباعة المباشر من المتصفح';
  heading.style.cssText = 'font-weight:900;font-size:14px;color:#fbbf24;margin-bottom:4px;';
  const desc = document.createElement('div');
  desc.textContent = 'للطباعة الفورية على A4 أو الحفظ كـ PDF: افتح التطبيق في تبويب مستقل أو نزّل ورقة الطباعة الجاهزة وافتحها.';
  desc.style.cssText = 'font-size:12px;color:#e2e8f0;line-height:1.5;';
  textWrap.appendChild(heading);
  textWrap.appendChild(desc);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'إغلاق التنبيه');
  closeBtn.style.cssText = 'background:rgba(255,255,255,0.1);color:#fff;border:0;border-radius:8px;width:28px;height:28px;cursor:pointer;font-weight:900;flex-shrink:0;';
  closeBtn.onclick = dismissPrintFallbackBanner;

  headerRow.appendChild(textWrap);
  headerRow.appendChild(closeBtn);

  const actionsRow = document.createElement('div');
  actionsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center;';

  const openTabLink = document.createElement('a');
  openTabLink.href = typeof window !== 'undefined' ? window.location.href : '/';
  openTabLink.target = '_blank';
  openTabLink.rel = 'noopener noreferrer';
  openTabLink.textContent = 'فتح في تبويب مستقل للطباعة المباشرة';
  openTabLink.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:9px 16px;border-radius:12px;background:#fbbf24;color:#0f172a;font-size:12px;font-weight:900;text-decoration:none;cursor:pointer;';

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.textContent = 'تنزيل ورقة الطباعة الجاهزة (A4)';
  downloadBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:9px 16px;border-radius:12px;background:#10b981;color:#ffffff;border:0;font-size:12px;font-weight:900;cursor:pointer;font-family:inherit;';
  downloadBtn.onclick = () => {
    downloadPrintableElementAsHtml(elementId, orientation, title);
  };

  actionsRow.appendChild(openTabLink);
  actionsRow.appendChild(downloadBtn);

  banner.appendChild(headerRow);
  banner.appendChild(actionsRow);
  document.body.appendChild(banner);
}

export function cleanupPrintPortal(): void {
  if (activeCleanupTimer) {
    clearTimeout(activeCleanupTimer);
    activeCleanupTimer = null;
  }
  if (activeBlockedCheckTimer) {
    clearTimeout(activeBlockedCheckTimer);
    activeBlockedCheckTimer = null;
  }
  if (activeAfterPrintHandler && typeof window !== 'undefined') {
    window.removeEventListener('afterprint', activeAfterPrintHandler);
    activeAfterPrintHandler = null;
  }
  if (activeBeforePrintHandler && typeof window !== 'undefined') {
    window.removeEventListener('beforeprint', activeBeforePrintHandler);
    activeBeforePrintHandler = null;
  }
  if (typeof document === 'undefined') return;
  document.body?.removeAttribute(PRINTING_BODY_ATTR);
  document.getElementById(PRINT_PORTAL_ID)?.remove();
  document.getElementById(DYNAMIC_PRINT_STYLE_ID)?.remove();
}

export function printElementById(
  elementId: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  options?: { title?: string; onPrintBlocked?: () => void }
): boolean {
  try {
    const el = document.getElementById(elementId);
    if (!el) {
      console.warn('Element for printing not found:', elementId);
      window.print();
      return false;
    }

    cleanupPrintPortal();
    dismissPrintFallbackBanner();

    const previousTitle = document.title;
    if (options?.title) {
      document.title = options.title;
    }

    const styleEl = document.createElement('style');
    styleEl.id = DYNAMIC_PRINT_STYLE_ID;
    styleEl.textContent = buildPrintIsolationCss(orientation);
    document.head.appendChild(styleEl);

    const clone = el.cloneNode(true) as HTMLElement;
    syncFormValuesToClone(el, clone);
    clone.querySelectorAll('.no-print').forEach((node) => node.remove());

    const portal = document.createElement('div');
    portal.id = PRINT_PORTAL_ID;
    portal.setAttribute('dir', 'rtl');
    portal.appendChild(clone);
    document.body.appendChild(portal);

    document.body.setAttribute(PRINTING_BODY_ATTR, 'true');

    let beforePrintFired = false;

    const cleanup = () => {
      if (options?.title) {
        document.title = previousTitle;
      }
      cleanupPrintPortal();
    };

    activeBeforePrintHandler = () => {
      beforePrintFired = true;
      if (activeBlockedCheckTimer) {
        clearTimeout(activeBlockedCheckTimer);
        activeBlockedCheckTimer = null;
      }
    };

    activeAfterPrintHandler = cleanup;
    window.addEventListener('beforeprint', activeBeforePrintHandler, { once: true });
    window.addEventListener('afterprint', cleanup, { once: true });
    activeCleanupTimer = setTimeout(cleanup, 60_000);

    // If the browser is inside a sandboxed iframe without `allow-modals`,
    // `window.print()` is silently ignored and `beforeprint` never fires.
    activeBlockedCheckTimer = setTimeout(() => {
      if (!beforePrintFired) {
        cleanup();
        showPrintFallbackBanner(elementId, orientation, options?.title || 'مستند للطباعة');
        options?.onPrintBlocked?.();
      }
    }, 400);

    // Trigger print synchronously inside the user's click event
    window.print();
    return true;
  } catch (error) {
    console.error('Print helper error:', error);
    cleanupPrintPortal();
    showPrintFallbackBanner(elementId, orientation, options?.title || 'مستند للطباعة');
    options?.onPrintBlocked?.();
    return false;
  }
}
