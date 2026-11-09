import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Gemini AI Assistant for Workshop & Quality Check
  app.post('/api/ai-assistant', async (req: Request, res: Response) => {
    const { prompt, orderContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const isExplicitDemo = process.env.ENABLE_AI_DEMO_MODE === 'true';

    // 1. Missing or placeholder API key check
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      if (isExplicitDemo) {
        // Explicit demo mode enabled via server-side flag
        return res.json({
          simulated: true,
          demo_mode: true,
          reply: `[محاكاة تجريبية - DEMO MODE مُفعّل على السيرفر]\n\nبناءً على المواصفات المسجلة للورشة:\n- المقاسات الهندسية: ${orderContext?.dimensions || 'حسب الرسم الهيكلي'}.\n- نوع الخشب المطلوب: ${orderContext?.wood_type || 'زان أحمر'}.\n- كود القماش: ${orderContext?.color_code || 'N/A'} (رقم الـ Batch: ${orderContext?.batch_number || 'N/A'}).\n- ملاحظة: هذا الرد تجريبي محاكى لعدم توفر مفتاح Gemini API.`,
        });
      }

      // Hardened 503 response when key is missing and demo mode is not explicitly enabled
      return res.status(503).json({
        code: 'SERVICE_UNAVAILABLE',
        error: 'GEMINI_API_KEY_MISSING',
        message: 'مفتاح الذكاء الاصطناعي GEMINI_API_KEY غير مهيأ على الخادم. يرجى ضبط المفتاح في المتغيرات البيئية.',
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `أنت مهندس خبير ومستشار جودة وتصنيع أثاث في مصنع "النجار ديزاين". 
تخصصك: دراسة أوامر الشغل، مطابقة مقاسات النجارين والدهان والتنجيد، والتدقيق في رقم الـ Batch للأقمشة ونوع الخشب ونوع البولي يوريثان.
أجب باللغة العربية بأسلوب مهني دقيق وعملي يناسب مهندسي الورشة والعمال والمدراء.`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT: Upstream service did not respond within 10s')), 10000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemInstruction}\n\nبيانات أمر الشغل المتاح:\n${JSON.stringify(
                    orderContext || {},
                    null,
                    2
                  )}\n\nسؤال/طلب المستخدم:\n${prompt}`,
                },
              ],
            },
          ],
        }),
        timeoutPromise,
      ]);

      res.json({ reply: response.text || 'تم معالجة الطلب بنجاح.' });
    } catch (error: any) {
      // Safe server-side logging without exposing API key or secrets
      const status = error?.status || error?.statusCode || 500;
      const rawMessage = error instanceof Error ? error.message : String(error);
      const sanitizedMessage = rawMessage.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
      console.error('[Gemini API Error - Sanitized]:', {
        status,
        name: error?.name || 'GeminiApiError',
        message: sanitizedMessage,
      });

      if (sanitizedMessage.includes('GEMINI_TIMEOUT')) {
        return res.status(504).json({
          code: 'GATEWAY_TIMEOUT',
          error: 'GEMINI_TIMEOUT',
          message: 'انتهت مهلة الاتصال بخدمة الذكاء الاصطناعي (تجاوز 10 ثوانٍ). يرجى المحاولة لاحقاً.',
        });
      }

      // Differentiate invalid credentials vs general server error
      if (
        status === 400 ||
        status === 401 ||
        status === 403 ||
        sanitizedMessage.includes('API key') ||
        sanitizedMessage.includes('credential') ||
        sanitizedMessage.includes('PERMISSION_DENIED')
      ) {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          error: 'GEMINI_AUTH_FAILED',
          message: 'بيانات اعتماد مفتاح Gemini غير صالحة أو منتهية الصلاحية.',
        });
      }

      return res.status(502).json({
        code: 'BAD_GATEWAY',
        error: 'GEMINI_UPSTREAM_ERROR',
        message: 'حدث خطأ أثناء معالجة الطلب عبر خدمة Gemini السحابية.',
      });
    }
  });

  // Explicit 404 handler for API routes to prevent SPA fallback from swallowing API requests
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'المسار البرمجي غير موجود (API endpoint not found)' });
  });

  // Serve Vite in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve production static assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const host = '0.0.0.0';
  app.listen(Number(PORT), host, () => {
    console.log(`[النجار ديزاين - El-Naggar Design Server] running on http://${host}:${PORT}`);
  });
}

startServer();
