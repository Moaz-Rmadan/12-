/**
 * Bulletproof A4 print utility for El-Naggar Furniture Factory.
 * Uses synchronous DOM portal isolation + native window.print() so printing works
 * reliably across desktop browsers, mobile/PWA offline mode, and nested iframe
 * preview sandboxes (zero window.open, zero 0x0 iframe blocking, zero CDN Tailwind race).
 */

export const PRINT_PORTAL_ID = 'print-portal-root';
export const DYNAMIC_PRINT_STYLE_ID = 'dynamic-print-style';
export const PRINTING_BODY_ATTR = 'data-printing-target';

let activeCleanupTimer: ReturnType<typeof setTimeout> | null = null;
let activeAfterPrintHandler: (() => void) | null = null;

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

      /* Customer Delivery Receipt Single-Page A4 Layout (overrides .print-card padding) */
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

export function cleanupPrintPortal(): void {
  if (activeCleanupTimer) {
    clearTimeout(activeCleanupTimer);
    activeCleanupTimer = null;
  }
  if (activeAfterPrintHandler && typeof window !== 'undefined') {
    window.removeEventListener('afterprint', activeAfterPrintHandler);
    activeAfterPrintHandler = null;
  }
  if (typeof document === 'undefined') return;
  document.body?.removeAttribute(PRINTING_BODY_ATTR);
  document.getElementById(PRINT_PORTAL_ID)?.remove();
  document.getElementById(DYNAMIC_PRINT_STYLE_ID)?.remove();
}

export function printElementById(
  elementId: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  options?: { title?: string }
): boolean {
  try {
    const el = document.getElementById(elementId);
    if (!el) {
      console.warn('Element for printing not found:', elementId);
      window.print();
      return false;
    }

    cleanupPrintPortal();

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

    const cleanup = () => {
      if (options?.title) {
        document.title = previousTitle;
      }
      cleanupPrintPortal();
    };

    activeAfterPrintHandler = cleanup;
    window.addEventListener('afterprint', cleanup, { once: true });
    activeCleanupTimer = setTimeout(cleanup, 60_000);

    // Trigger print synchronously inside the user's click event so browser
    // transient user activation is preserved in embedded iframes & mobile browsers.
    window.print();
    return true;
  } catch (error) {
    console.error('Print helper error:', error);
    cleanupPrintPortal();
    try {
      window.print();
    } catch {
      // Ignore if host blocks window.print
    }
    return false;
  }
}
