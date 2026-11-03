import React, { useState } from 'react';
import { FolderTree, Folder, FileCode, CheckCircle2, Server, Layout, ShieldCheck } from 'lucide-react';

export const ProjectFolderViewer: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<string>('backend-overview');

  const folderExplanations: Record<string, { title: string; desc: string; contents: string[] }> = {
    'backend-overview': {
      title: 'الهيكل المقترح للـ Back-End (Node.js / Express + Supabase)',
      desc: 'بنية معمارية نمطية (Modular Layered Architecture) تضمن فصل المسؤوليات وسهولة التوسع.',
      contents: [
        'src/controllers/ : معالجة منطق الطلبات (Request/Response) وإرجاع الاستجابات المناسبة.',
        'src/routes/ : توجيه المسارات المتاحة للـ API (/api/v1/customers, /api/v1/job-orders).',
        'src/models/ أو src/db/schema.ts : تعريف كود والجداول مع Drizzle ORM أو Supabase Client.',
        'src/services/ : المنطق التجاري التجاري (Business Logic) ومطابقة الـ Batch والتكامل مع الذكاء الاصطناعي.',
        'src/middlewares/ : التحقق من الأخطاء، المصادقة (Auth)، والتدقيق في إدخالات النجارين والعملاء.',
      ],
    },
    'frontend-overview': {
      title: 'الهيكل المقترح للـ Front-End (React + Vite + Tailwind CSS)',
      desc: 'بنية المكونات (Component-Driven Architecture) سريعة الاستجابة وتدعم الوضع الداكن والطباعة.',
      contents: [
        'src/components/ : مكونات الواجهة المجمعة (جدول أوامر الشغل، كارت الورشة، بطاقات الإحصائيات).',
        'src/pages/ : صفحات التطبيق الرئيسية (الأوامر، العملاء، قاعدة البيانات، الذكاء الاصطناعي).',
        'src/services/api.ts : طبقة الاتصال مع الـ Backend عبر Axios أو Fetch API.',
        'src/types/ : تعريفات TypeScript الموحدة للبيانات المطابقة لجدول PostgreSQL.',
        'src/assets/ : الصور والملفات الهندسية وعينات القماش وشعارات المصنع.',
      ],
    },
  };

  return (
    <div className="space-y-8">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-amber-50 p-6 rounded-2xl border border-amber-800/40 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <FolderTree className="w-4 h-4" />
            <span>Full-Stack Enterprise Architecture</span>
          </div>
          <h2 className="text-xl font-black font-serif text-amber-100">
            هيكل مجلدات المشروع المقترح (Back-End & Front-End)
          </h2>
          <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
            شرح تفصيلي لتنظيم مجلدات المشروع لمصنع النجار ديزاين بناءً على أفضل الممارسات المعمارية بفصل الـ API عن الواجهة الأمامية لضمان الاستقرار والأمان.
          </p>
        </div>
      </div>

      {/* Grid view of Backend vs Frontend Trees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BACKEND TREE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-base border-b border-slate-200 dark:border-slate-800 pb-3">
            <Server className="w-5 h-5 text-amber-700" />
            <h3>1. هيكل المجلدات - Back-End (Express/Node.js)</h3>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 text-amber-200/90 font-mono text-xs space-y-2 border border-slate-800 dir-ltr text-left">
            <div className="font-bold text-amber-400">/el-naggar-backend/</div>
            <div className="pl-4">├── <span className="text-emerald-400 font-bold">src/</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">controllers/</span> <span className="text-slate-500"># (customers.controller.ts, orders.controller.ts)</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">routes/</span> <span className="text-slate-500"># (customers.routes.ts, orders.routes.ts)</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">services/</span> <span className="text-slate-500"># (batch.service.ts, ai.service.ts)</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">models/ / db/</span> <span className="text-slate-500"># (schema.ts, drizzle.config.ts)</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">middlewares/</span> <span className="text-slate-500"># (errorHandler.ts, validator.ts)</span></div>
            <div className="pl-8">└── <span className="font-bold text-white">server.ts</span> <span className="text-slate-500"># (Main App Entry Point)</span></div>
            <div className="pl-4">├── <span className="text-slate-300">.env</span></div>
            <div className="pl-4">├── <span className="text-slate-300">package.json</span></div>
            <div className="pl-4">└── <span className="text-slate-300">tsconfig.json</span></div>
          </div>

          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">مسؤوليات الـ Backend:</h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-400">
              <li>الربط مع قاعدة بيانات Supabase (PostgreSQL) وتتبع المعاملات (Transactions).</li>
              <li>التحقق من فرادة رقم الـ Batch لمنع اختلاف ألوان التنجيد بالأوامر.</li>
              <li>الربط السريع مع نماذج Gemini API للتدقيق التقني وتسهيل استشارات الورشة.</li>
            </ul>
          </div>
        </div>

        {/* FRONTEND TREE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-base border-b border-slate-200 dark:border-slate-800 pb-3">
            <Layout className="w-5 h-5 text-amber-700" />
            <h3>2. هيكل المجلدات - Front-End (React + Vite)</h3>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 text-amber-200/90 font-mono text-xs space-y-2 border border-slate-800 dir-ltr text-left">
            <div className="font-bold text-amber-400">/el-naggar-frontend/</div>
            <div className="pl-4">├── <span className="text-emerald-400 font-bold">src/</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">components/</span> <span className="text-slate-500"># (WorkshopCard, OrderList, OrderFormModal)</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">pages/</span> <span className="text-slate-500"># (Dashboard, OrdersPage, CustomersPage)</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">types/</span> <span className="text-slate-500"># (index.ts - DDL Schemas)</span></div>
            <div className="pl-8">├── <span className="text-amber-300 font-bold">assets/</span> <span className="text-slate-500"># (images, cad_drawings, fabric_swatches)</span></div>
            <div className="pl-8">└── <span className="font-bold text-white">App.tsx &amp; main.tsx</span></div>
            <div className="pl-4">├── <span className="text-slate-300">index.html</span> <span className="text-slate-500"># (Arabic RTL & Cairo Fonts)</span></div>
            <div className="pl-4">├── <span className="text-slate-300">vite.config.ts</span></div>
            <div className="pl-4">└── <span className="text-slate-300">tailwind.config.js</span></div>
          </div>

          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">مميزات الـ Frontend:</h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-400">
              <li>دعم كامل للغة العربية (RTL) مع خطوط Cairo وTajawal المخصصة للأثاث.</li>
              <li>نموذج كارت الورشة القابل للطباعة المباشرة من المتصفح (Print Styles).</li>
              <li>دعم الوضع الداكن والتجاوب الكامل مع الهواتف الذكية والأجهزة اللوحية بالورشة.</li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
};
