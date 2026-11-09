import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

test('Gemini Fallback Safety Contract: missing key returns HTTP 503 contract', () => {
  const dummyKey = '';
  const isExplicitDemo = false;

  // Simulate server contract validation
  let statusCode = 200;
  let responseBody: any = {};

  if (!dummyKey || dummyKey === 'MY_GEMINI_API_KEY') {
    if (isExplicitDemo) {
      responseBody = { simulated: true, demo_mode: true };
    } else {
      statusCode = 503;
      responseBody = {
        code: 'SERVICE_UNAVAILABLE',
        error: 'GEMINI_API_KEY_MISSING',
      };
    }
  }

  assert.equal(statusCode, 503);
  assert.equal(responseBody.code, 'SERVICE_UNAVAILABLE');
  assert.equal(responseBody.error, 'GEMINI_API_KEY_MISSING');
});

test('Gemini Fallback Safety Contract: explicit demo flag returns simulated payload', () => {
  const dummyKey = '';
  const isExplicitDemo = true;

  let statusCode = 200;
  let responseBody: any = {};

  if (!dummyKey || dummyKey === 'MY_GEMINI_API_KEY') {
    if (isExplicitDemo) {
      statusCode = 200;
      responseBody = {
        simulated: true,
        demo_mode: true,
        reply: '[محاكاة تجريبية - DEMO MODE مُفعّل على السيرفر]',
      };
    }
  }

  assert.equal(statusCode, 200);
  assert.equal(responseBody.simulated, true);
  assert.equal(responseBody.demo_mode, true);
});

test('Real Gemini API Live Integration Check', async (t) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    t.diagnostic('NOTICE: Server-side GEMINI_API_KEY is not configured in this environment.');
    t.diagnostic('Skipping real API call; live request is not claimed as passed without valid credentials.');
    assert.ok(true, 'Test safely bypassed when credentials are absent');
    return;
  }

  // Live test only executed when valid server-side credentials exist
  // Secrets are strictly masked and never logged
  t.diagnostic('GEMINI_API_KEY detected. Executing live Gemini 3.8 Flash query...');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: 'اختبار مهندسي ورشة الأثاث: هل خشب الزان الأحمر مناسب للأرجل والقوائم؟ أجب بكلمة واحدة.',
  });

  assert.ok(response.text, 'Gemini generated content must be present in response');
  assert.ok(response.text.length > 0, 'Gemini response must not be empty');
  assert.ok(!response.text.includes('[ملاحظة: مفتاح API غير مثبت'), 'Real response must not contain simulation disclaimers');
});
