import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFirebaseAuthError, extractFirebaseErrorCode } from '../utils/authErrorMessages';

test('extractFirebaseErrorCode extracts Firebase auth code from object and Error strings', () => {
  assert.equal(extractFirebaseErrorCode({ code: 'auth/popup-blocked' }), 'auth/popup-blocked');
  assert.equal(
    extractFirebaseErrorCode(new Error('Firebase: Error (auth/unauthorized-domain).')),
    'auth/unauthorized-domain'
  );
  assert.equal(extractFirebaseErrorCode('unknown failure'), 'auth/unknown');
});

test('parseFirebaseAuthError guides standalone desktop PWA users to redirect fallback when popup is blocked', () => {
  const standaloneResult = parseFirebaseAuthError(
    { code: 'auth/popup-blocked' },
    { provider: 'google', isStandalonePwa: true, isEmbeddedIframe: false }
  );
  assert.equal(standaloneResult.canRetryWithRedirect, true);
  assert.match(standaloneResult.message, /المنبثقة/);

  const iframeResult = parseFirebaseAuthError(
    { code: 'auth/popup-blocked' },
    { provider: 'google', isStandalonePwa: false, isEmbeddedIframe: true }
  );
  assert.equal(iframeResult.canRetryWithRedirect, false);
});

test('parseFirebaseAuthError distinguishes disabled provider and unauthorized domain from wrong password', () => {
  const disabledPass = parseFirebaseAuthError(
    { code: 'auth/operation-not-allowed' },
    { provider: 'password' }
  );
  assert.match(disabledPass.message, /جوجل/);
  assert.doesNotMatch(disabledPass.message, /كلمة المرور غير صحيحة/);

  const unauthDomain = parseFirebaseAuthError(
    { code: 'auth/unauthorized-domain' },
    { provider: 'google', hostname: '192.168.1.15' }
  );
  assert.match(unauthDomain.message, /192\.168\.1\.15/);
  assert.match(unauthDomain.detailHint || '', /Authorized domains/);
});

test('parseFirebaseAuthError provides Google guidance when invalid-credential occurs on password form', () => {
  const res = parseFirebaseAuthError(
    { code: 'auth/invalid-credential' },
    { provider: 'password', ownerEmail: 'cfo.moaz@gmail.com' }
  );
  assert.match(res.detailHint || '', /cfo\.moaz@gmail\.com/);
  assert.match(res.detailHint || '', /تسجيل الدخول بحساب جوجل/);
});
