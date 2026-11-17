import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrintIsolationCss,
  cleanupPrintPortal,
  DYNAMIC_PRINT_STYLE_ID,
  PRINT_PORTAL_ID,
  printElementById,
  PRINTING_BODY_ATTR,
} from '../utils/printHelper';

test('buildPrintIsolationCss targets A4 orientation, hides non-portal content, and formats delivery receipt without CDN Tailwind', () => {
  const portraitCss = buildPrintIsolationCss('portrait');
  assert.match(portraitCss, /size:\s*A4 portrait/);
  assert.match(portraitCss, /#print-portal-root\s*\{[\s\S]*display:\s*none !important/);
  assert.match(portraitCss, /body\[data-printing-target="true"\]\s*>\s*\*:not\(#print-portal-root\)/);
  assert.match(portraitCss, /#printable-delivery-receipt/);
  assert.match(portraitCss, /#printable-truck-manifest/);
  assert.doesNotMatch(portraitCss, /cdn\.tailwindcss\.com/);

  const landscapeCss = buildPrintIsolationCss('landscape');
  assert.match(landscapeCss, /size:\s*A4 landscape/);
  assert.match(landscapeCss, /max-width:\s*285mm !important/);
});

test('printElementById clones element synchronously into portal, triggers window.print, and cleans up on afterprint', () => {
  const removedIds: string[] = [];
  const addedNodes: Record<string, any> = {};
  const bodyAttrs = new Map<string, string>();
  const listeners = new Map<string, Array<() => void>>();
  let printCallCount = 0;

  const makeMockNode = (id: string, classes: string[] = []) => {
    const children: any[] = [];
    const node: any = {
      id,
      className: classes.join(' '),
      textContent: '',
      children,
      parentNode: null as any,
      setAttribute(k: string, v: string) {
        if (this === mockBody) bodyAttrs.set(k, v);
      },
      removeAttribute(k: string) {
        if (this === mockBody) bodyAttrs.delete(k);
      },
      appendChild(child: any) {
        child.parentNode = this;
        children.push(child);
        if (child.id) addedNodes[child.id] = child;
        return child;
      },
      remove() {
        removedIds.push(this.id);
        delete addedNodes[this.id];
        if (this.parentNode && Array.isArray(this.parentNode.children)) {
          const idx = this.parentNode.children.indexOf(this);
          if (idx >= 0) this.parentNode.children.splice(idx, 1);
        }
      },
      querySelectorAll(selector: string) {
        if (selector === '.no-print') {
          return children.filter((c) => String(c.className).includes('no-print'));
        }
        return [];
      },
      cloneNode() {
        const cloned = makeMockNode(id, classes);
        children.forEach((c) => {
          const clonedChild = makeMockNode(c.id, [c.className]);
          cloned.appendChild(clonedChild);
        });
        return cloned;
      },
    };
    return node;
  };

  const receiptEl = makeMockNode('printable-delivery-receipt');
  receiptEl.children.push(makeMockNode('controls', ['no-print']));
  const mockHead = makeMockNode('head');
  const mockBody = makeMockNode('body');

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;

  try {
    (globalThis as any).document = {
      title: 'النجار ديزاين',
      head: mockHead,
      body: mockBody,
      createElement(tag: string) {
        return makeMockNode(tag);
      },
      getElementById(id: string) {
        if (id === 'printable-delivery-receipt') return receiptEl;
        return addedNodes[id] || null;
      },
    };

    (globalThis as any).window = {
      print() {
        printCallCount += 1;
        assert.equal(bodyAttrs.get(PRINTING_BODY_ATTR), 'true');
        assert.ok(addedNodes[PRINT_PORTAL_ID], 'portal must exist before window.print runs');
        assert.ok(addedNodes[DYNAMIC_PRINT_STYLE_ID], 'print style must exist before window.print runs');
        assert.equal(
          addedNodes[PRINT_PORTAL_ID].children[0].querySelectorAll('.no-print').length,
          0,
          '.no-print children must be stripped from cloned receipt'
        );
      },
      addEventListener(evt: string, cb: () => void) {
        const list = listeners.get(evt) || [];
        list.push(cb);
        listeners.set(evt, list);
      },
      removeEventListener(evt: string, cb: () => void) {
        const list = listeners.get(evt) || [];
        listeners.set(
          evt,
          list.filter((fn) => fn !== cb)
        );
      },
    };

    const result = printElementById('printable-delivery-receipt', 'portrait', {
      title: 'إقرار استلام - عميل تجريبي',
    });

    assert.equal(result, true);
    assert.equal(printCallCount, 1);
    assert.equal((globalThis as any).document.title, 'إقرار استلام - عميل تجريبي');

    // Simulate browser afterprint event
    const afterPrintCallbacks = listeners.get('afterprint') || [];
    assert.equal(afterPrintCallbacks.length, 1);
    afterPrintCallbacks[0]();

    assert.equal(bodyAttrs.has(PRINTING_BODY_ATTR), false);
    assert.equal((globalThis as any).document.title, 'النجار ديزاين');
    assert.ok(removedIds.includes(PRINT_PORTAL_ID));
    assert.ok(removedIds.includes(DYNAMIC_PRINT_STYLE_ID));
  } finally {
    cleanupPrintPortal();
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
  }
});
