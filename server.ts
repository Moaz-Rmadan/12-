import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

import {
  initialCustomers,
  initialOrders,
  initialDetails,
  initialAttachments,
} from './src/data/mockData.js';
import { Customer, JobOrder, JobDetail, Attachment, OrderStatus } from './src/types/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory data store initialized with seed data
let customers: Customer[] = [...initialCustomers];
let jobOrders: JobOrder[] = [...initialOrders];
let jobDetails: JobDetail[] = [...initialDetails];
let attachments: Attachment[] = [...initialAttachments];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Helper to construct populated order
  const populateOrder = (ord: JobOrder) => ({
    ...ord,
    customer: customers.find((c) => c.id === ord.customer_id),
    job_details: jobDetails.find((d) => d.job_order_id === ord.id),
    attachments: attachments.filter((a) => a.job_order_id === ord.id),
  });

  // REST API Routes

  // Customers API
  app.get('/api/customers', (_req: Request, res: Response) => {
    res.json(customers);
  });

  app.post('/api/customers', (req: Request, res: Response) => {
    const { name, phone, address } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: 'اسم العميل ورقم الهاتف مطلوبان' });
      return;
    }
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      address: address || '',
      created_at: new Date().toISOString(),
    };
    customers.push(newCust);
    res.status(201).json(newCust);
  });

  // Job Orders API
  app.get('/api/job-orders', (req: Request, res: Response) => {
    const { status, search } = req.query;
    let result = jobOrders.map(populateOrder);

    if (status && status !== 'الكل') {
      result = result.filter((o) => o.status === status);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.room_model_code.toLowerCase().includes(q) ||
          o.customer?.name.toLowerCase().includes(q) ||
          o.customer?.phone.includes(q) ||
          o.general_specs.toLowerCase().includes(q)
      );
    }

    res.json(result);
  });

  app.get('/api/job-orders/:id', (req: Request, res: Response) => {
    const ord = jobOrders.find((o) => o.id === req.params.id);
    if (!ord) {
      res.status(404).json({ error: 'أمر الشغل غير موجود' });
      return;
    }
    res.json(populateOrder(ord));
  });

  app.post('/api/job-orders', (req: Request, res: Response) => {
    try {
      const { customer, job_order, job_details, attachments: atts } = req.body;

      if (!customer?.name || !job_order?.order_number) {
        res.status(400).json({ error: 'بيانات العميل ورقم أمر الشغل مطلوبة' });
        return;
      }

      // Check or create customer
      let existingCust = customers.find(
        (c) => c.phone === customer.phone || c.name === customer.name
      );
      if (!existingCust) {
        existingCust = {
          id: `cust-${Date.now()}`,
          name: customer.name,
          phone: customer.phone || '',
          address: customer.address || '',
          created_at: new Date().toISOString(),
        };
        customers.push(existingCust);
      } else if (customer.address) {
        existingCust.address = customer.address;
      }

      const orderId = `ord-${Date.now()}`;
      const newOrder: JobOrder = {
        id: orderId,
        order_number: job_order.order_number,
        customer_id: existingCust.id,
        room_model_code: job_order.room_model_code || 'RM-MOD-01',
        contract_date: job_order.contract_date || new Date().toISOString().split('T')[0],
        delivery_date: job_order.delivery_date || new Date().toISOString().split('T')[0],
        general_specs: job_order.general_specs || '',
        status: (job_order.status as OrderStatus) || 'قيد التشغيل',
        total_price: Number(job_order.total_price) || 0,
        deposit_paid: Number(job_order.deposit_paid) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      jobOrders.push(newOrder);

      // Create job details
      const detailId = `det-${Date.now()}`;
      const newDetail: JobDetail = {
        id: detailId,
        job_order_id: orderId,
        dimensions_cm: job_details?.dimensions_cm || 'حسب الرسم الهيكلي',
        wood_type: job_details?.wood_type || 'خشب زان أحمر',
        paint_details: job_details?.paint_details || 'حسب كرت العينة',
        fabric_source: job_details?.fabric_source || 'وارد المصنع',
        color_code: job_details?.color_code || 'N/A',
        batch_number: job_details?.batch_number || 'N/A',
        installation_notes: job_details?.installation_notes || 'لا يوجد',
        created_at: new Date().toISOString(),
      };
      jobDetails.push(newDetail);

      // Attachments
      const createdAttachments: Attachment[] = [];
      if (Array.isArray(atts)) {
        atts.forEach((a, idx) => {
          if (a.file_url) {
            const newAtt: Attachment = {
              id: `att-${Date.now()}-${idx}`,
              job_order_id: orderId,
              file_type: a.file_type || 'drawing',
              file_url: a.file_url,
              title: a.title || 'مرفق جديد',
              description: a.description || '',
              uploaded_at: new Date().toISOString(),
            };
            attachments.push(newAtt);
            createdAttachments.push(newAtt);
          }
        });
      }

      res.status(201).json(populateOrder(newOrder));
    } catch (err) {
      res.status(500).json({ error: 'حدث خطأ أثناء حفظ أمر الشغل' });
    }
  });

  // Update status quickly
  app.patch('/api/job-orders/:id/status', (req: Request, res: Response) => {
    const { status } = req.body;
    const ord = jobOrders.find((o) => o.id === req.params.id);
    if (!ord) {
      res.status(404).json({ error: 'أمر الشغل غير موجود' });
      return;
    }

    if (!['قيد التشغيل', 'تم التنفيذ', 'تسليم'].includes(status)) {
      res.status(400).json({ error: 'حالة أمر الشغل غير صالحة' });
      return;
    }

    ord.status = status as OrderStatus;
    ord.updated_at = new Date().toISOString();
    res.json(populateOrder(ord));
  });

  // Delete Job Order
  app.delete('/api/job-orders/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    jobOrders = jobOrders.filter((o) => o.id !== id);
    jobDetails = jobDetails.filter((d) => d.job_order_id !== id);
    attachments = attachments.filter((a) => a.job_order_id !== id);
    res.json({ success: true, message: 'تم حذف أمر الشغل بنجاح' });
  });

  // Gemini AI Assistant for Workshop & Quality Check
  app.post('/api/ai-assistant', async (req: Request, res: Response) => {
    const { prompt, orderContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        reply: `[ملاحظة: مفتاح API غير مثبت ولكن يتم محاكاة الرد التقني]\n\nبناءً على المواصفات المدخلة لورشة مصنع النجار ديزاين:\n- أبعاد القطعة تتطلب خشب زان أحمر للسطح السفلي لضمان عدم الانحناء.\n- يفضل مطابقة رقم الـ Batch لكود القماش (${orderContext?.color_code || 'القطيفة'}) لتجنب اختلاف درجات الشلوف.\n- التوجيه بالدهان: طبقة بولي يوريثان مط ضد التبصيم لحماية القشرة.`,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `أنت مهندس خبير ومستشار جودة وتصنيع أثاث في مصنع "النجار ديزاين". 
تخصصك: دراسة أوامر الشغل، مطابقة مقاسات النجارين والدهان والتنجيد، والتدقيق في رقم الـ Batch للأقمشة ونوع الخشب ونوع البولي يوريثان.
أجب باللغة العربية بأسلوب مهني دقيق وعملي يناسب مهندسي الورشة والعمال والمدراء.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
      });

      res.json({ reply: response.text || 'تم معالجة الطلب بنجاح.' });
    } catch (error) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: 'عذراً، حدث خطأ أثناء الاتصال بمساعد الذكاء الاصطناعي.' });
    }
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

  app.listen(PORT, () => {
    console.log(`[النجار ديزاين - El-Naggar Design Server] running on http://localhost:${PORT}`);
  });
}

startServer();
