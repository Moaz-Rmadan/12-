import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  getFirebaseAdminApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  hasServiceAccountCredentials,
} from './server/lib/firebase-admin';
import { authenticate } from './server/middleware/authenticate';
import {
  requireAdmin,
  requireAccounting,
  requireOperations,
  requireSales,
  requireRole,
  requireDelegatedOperationsManager,
} from './server/middleware/authorize';
import { requestLogger } from './server/middleware/request-logger';
import { errorHandler } from './server/middleware/error-handler';
import { generateNextOrderNumber } from './server/services/order-number.service';
import { recordAuditEvent } from './server/services/audit.service';
import { isValidTechnicalRole } from './server/types/auth';

dotenv.config();

// Ensure Firebase Admin singleton initialization
getFirebaseAdminApp();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GEMINI_MODEL = 'gemini-4-hydrogen';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use(requestLogger);

  // Gemini AI Assistant for Workshop & Quality Check
  app.post('/api/ai-assistant', authenticate, async (req: Request, res: Response) => {
    const { prompt, orderContext } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        code: 'INVALID_PROMPT',
        error: 'VALIDATION_ERROR',
        message: 'يرجى كتابة السؤال أو الاستفسار أولاً.',
      });
    }

    if (prompt.length > 4000) {
      return res.status(400).json({
        code: 'PROMPT_TOO_LONG',
        error: 'VALIDATION_ERROR',
        message: 'النص المدخل طويل جداً. يرجى الاختصار إلى 4000 حرف كحد أقصى.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isExplicitDemo = process.env.ENABLE_AI_DEMO_MODE === 'true';

    // Missing or placeholder API key check
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      if (isExplicitDemo) {
        return res.json({
          simulated: true,
          demo_mode: true,
          reply: `[محاكاة تجريبية - DEMO MODE مُفعّل على السيرفر]\n\nبناءً على المواصفات المسجلة للورشة:\n- المقاسات الهندسية: ${orderContext?.dimensions || 'حسب الرسم الهيكلي'}.\n- نوع الخشب المطلوب: ${orderContext?.wood_type || 'زان أحمر'}.\n- كود القماش: ${orderContext?.color_code || 'N/A'} (رقم الـ Batch: ${orderContext?.batch_number || 'N/A'}).\n- ملاحظة: هذا الرد تجريبي محاكى لعدم توفر مفتاح Gemini API.`,
        });
      }

      return res.status(503).json({
        code: 'SERVICE_UNAVAILABLE',
        error: 'GEMINI_API_KEY_MISSING',
        message: 'مفتاح الذكاء الاصطناعي GEMINI_API_KEY غير مهيأ على الخادم. يرجى ضبط المفتاح في المتغيرات البيئية.',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `أنت مهندس خبير ومستشار جودة وتصنيع أثاث في مصنع "النجار فيرنتشر".
تخصصك: دراسة أوامر الشغل، مطابقة مقاسات النجارين والدهان والتنجيد، والتدقيق في رقم الـ Batch للأقمشة ونوع الخشب ونوع البولي يوريثان.
أجب باللغة العربية بأسلوب مهني دقيق وعملي يناسب مهندسي الورشة والعمال والمدراء.`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT: Upstream service did not respond within 15s')), 15000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemInstruction}\n\nبيانات أمر الشغل المتاح:\n${JSON.stringify(
                    orderContext || {},
                    null,
                    2
                  )}\n\nسؤال/طلب المستخدم:\n${prompt.trim()}`,
                },
              ],
            },
          ],
        }),
        timeoutPromise,
      ]);

      return res.json({ reply: response.text || 'تم معالجة الطلب بنجاح.' });
    } catch (error: any) {
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
          message: 'انتهت مهلة الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.',
        });
      }

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

  // ---------------------------------------------------------------------------
  // Authentication & Trusted Authorization Endpoints
  // ---------------------------------------------------------------------------
  app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
    const user = req.user;
    res.json({
      status: 'authenticated',
      user: {
        uid: user?.uid,
        email: user?.email,
        role: user?.role,
        isActive: user?.isActive,
        isDelegatedManager: user?.isDelegatedManager,
        name: user?.name,
      },
    });
  });

  // Atomic Order Number Generation Endpoint (admin or sales)
  app.post(
    '/api/orders/next-number',
    authenticate,
    requireRole(['admin', 'sales']),
    async (_req: Request, res: Response, next) => {
      try {
        const result = await generateNextOrderNumber();
        res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  // Admin User Provisioning (creates real Firebase Auth user + Firestore profile when Admin credentials exist)
  app.post('/api/admin/users', authenticate, requireAdmin, async (req: Request, res: Response) => {
    const { name, email, role, isDelegatedManager, temporaryPassword, password } = req.body || {};
    const effectivePassword =
      typeof temporaryPassword === 'string' && temporaryPassword.trim().length >= 6
        ? temporaryPassword.trim()
        : typeof password === 'string' && password.trim().length >= 6
        ? password.trim()
        : null;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'يرجى إدخال اسم المستخدم كاملاً.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'يرجى إدخال بريد إلكتروني صحيح.' });
    }
    if (!isValidTechnicalRole(role)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'الدور الوظيفي المحدد غير صالح.' });
    }

    if (!hasServiceAccountCredentials()) {
      return res.status(501).json({
        code: 'ADMIN_SDK_UNAVAILABLE',
        message: 'إنشاء حساب المصادقة مباشرة من الخادم يتطلب FIREBASE_SERVICE_ACCOUNT. سيتم استخدام نظام الدعوة المؤمنة عبر Firestore.',
      });
    }

    const emailLower = email.trim().toLowerCase();
    const nowIso = new Date().toISOString();
    const delegated = role === 'operations' && Boolean(isDelegatedManager);

    try {
      const fbAuth = getFirebaseAuth();
      const db = getFirebaseFirestore();

      let authUser;
      try {
        authUser = await fbAuth.getUserByEmail(emailLower);
      } catch {
        authUser = await fbAuth.createUser({
          email: emailLower,
          displayName: name.trim(),
          password: effectivePassword || `ElNaggar#${Math.random().toString(36).slice(2, 10)}`,
          emailVerified: false,
        });
      }

      const profile = {
        uid: authUser.uid,
        email: emailLower,
        name: name.trim(),
        role,
        isActive: true,
        isDelegatedManager: delegated,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: req.user?.email || '',
      };

      await db.collection('users').doc(authUser.uid).set(profile, { merge: true });

      if (req.user) {
        await recordAuditEvent(
          {
            actor: req.user,
            action: 'USER_PROVISIONED',
            entityType: 'user',
            entityId: authUser.uid,
            after: profile,
            reason: 'Provisioned via Admin API',
          },
          db
        );
      }

      return res.status(201).json({ profile });
    } catch (err: any) {
      console.error('[Admin User Provisioning Error]:', err);
      return res.status(500).json({
        code: 'USER_PROVISION_FAILED',
        message: 'تعذر إنشاء حساب المستخدم على الخادم.',
      });
    }
  });

  // Diagnostic Test Routes: STRICTLY isolated to non-production environments
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/auth/test/admin-only', authenticate, requireAdmin, (req: Request, res: Response) => {
      res.json({ status: 'authorized', role: req.user?.role });
    });

    app.get('/api/auth/test/accounting', authenticate, requireAccounting, (req: Request, res: Response) => {
      res.json({ status: 'authorized', role: req.user?.role });
    });

    app.get('/api/auth/test/operations', authenticate, requireOperations, (req: Request, res: Response) => {
      res.json({ status: 'authorized', role: req.user?.role });
    });

    app.get('/api/auth/test/sales', authenticate, requireSales, (req: Request, res: Response) => {
      res.json({ status: 'authorized', role: req.user?.role });
    });

    app.get(
      '/api/auth/test/delegated-operations',
      authenticate,
      requireDelegatedOperationsManager,
      (req: Request, res: Response) => {
        res.json({
          status: 'authorized',
          role: req.user?.role,
          isDelegatedManager: req.user?.isDelegatedManager,
        });
      }
    );
  }

  // Explicit 404 handler for API routes
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'المسار البرمجي غير موجود (API endpoint not found)' });
  });

  // Centralized Error-Handling Middleware
  app.use(errorHandler);

  const httpServer = http.createServer(app);

  // Serve Vite in development
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
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
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const host = '0.0.0.0';
  httpServer.listen(Number(PORT), host, () => {
    console.log(`[النجار فيرنتشر - El-Naggar Server] running on http://${host}:${PORT}`);
  });
}

startServer();
