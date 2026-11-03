import React, { useState } from 'react';
import { Database, Copy, Check, Table, Key, ArrowRightLeft, Code2, Layers } from 'lucide-react';

export const DatabaseSchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [dbEngine, setDbEngine] = useState<'postgresql' | 'sqlite'>('postgresql');

  const pgSqlScript = `-- ==============================================================================
-- SQL DATABASE SCHEMA: EL-NAGGAR DESIGN JOB ORDER SYSTEM
-- PostgreSQL / Supabase DDL Script with Foreign Keys & Triggers
-- ==============================================================================

-- 1. ENUM TYPES
CREATE TYPE order_status_enum AS ENUM ('قيد التشغيل', 'تم التنفيذ', 'تسليم');
CREATE TYPE attachment_type_enum AS ENUM ('drawing', 'fabric_sample', '3d_render', 'other');

-- 2. CUSTOMERS TABLE (جدول العملاء)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. JOB ORDERS TABLE (جدول أوامر الشغل)
CREATE TABLE job_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) NOT NULL UNIQUE, -- e.g. JO-2026-101
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    room_model_code VARCHAR(100) NOT NULL, -- كود الغرفة/الموديل
    contract_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    general_specs TEXT, -- المواصفات العامة
    status order_status_enum NOT NULL DEFAULT 'قيد التشغيل',
    total_price DECIMAL(12, 2) DEFAULT 0.00,
    deposit_paid DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. JOB DETAILS TABLE (تفاصيل الورش والتشغيل)
CREATE TABLE job_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID NOT NULL UNIQUE REFERENCES job_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    dimensions_cm TEXT NOT NULL, -- المقاسات بالسم
    wood_type VARCHAR(255) DEFAULT 'خشب زان أحمر',
    paint_details TEXT NOT NULL, -- تفاصيل الدهان
    fabric_source VARCHAR(255) NOT NULL, -- مصدر القماش
    color_code VARCHAR(100) NOT NULL, -- كود اللون
    batch_number VARCHAR(100) NOT NULL, -- رقم الـ Batch
    installation_notes TEXT, -- ملاحظات التركيب
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. ATTACHMENTS TABLE (جدول المرفقات وكروت العينات)
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    file_type attachment_type_enum NOT NULL DEFAULT 'drawing',
    file_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. INDEXES
CREATE INDEX idx_job_orders_customer ON job_orders(customer_id);
CREATE INDEX idx_job_orders_status ON job_orders(status);
CREATE INDEX idx_job_orders_number ON job_orders(order_number);
CREATE INDEX idx_job_details_job_order ON job_details(job_order_id);
CREATE INDEX idx_attachments_job_order ON attachments(job_order_id);`;

  const sqliteScript = `-- ==============================================================================
-- SQL DATABASE SCHEMA: EL-NAGGAR DESIGN JOB ORDER SYSTEM
-- SQLite DDL Script with Foreign Keys
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. CUSTOMERS TABLE
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. JOB ORDERS TABLE
CREATE TABLE job_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    room_model_code TEXT NOT NULL,
    contract_date TEXT NOT NULL,
    delivery_date TEXT NOT NULL,
    general_specs TEXT,
    status TEXT CHECK(status IN ('قيد التشغيل', 'تم التنفيذ', 'تسليم')) DEFAULT 'قيد التشغيل',
    total_price REAL DEFAULT 0.0,
    deposit_paid REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. JOB DETAILS TABLE
CREATE TABLE job_details (
    id TEXT PRIMARY KEY,
    job_order_id TEXT NOT NULL UNIQUE REFERENCES job_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    dimensions_cm TEXT NOT NULL,
    wood_type TEXT DEFAULT 'خشب زان أحمر',
    paint_details TEXT NOT NULL,
    fabric_source TEXT NOT NULL,
    color_code TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    installation_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. ATTACHMENTS TABLE
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    job_order_id TEXT NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    file_type TEXT CHECK(file_type IN ('drawing', 'fabric_sample', '3d_render', 'other')) DEFAULT 'drawing',
    file_url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

  const activeScript = dbEngine === 'postgresql' ? pgSqlScript : sqliteScript;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-amber-50 p-6 rounded-2xl border border-amber-800/40 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Database Architecture DDL - Supabase & PostgreSQL & SQLite</span>
          </div>
          <h2 className="text-xl font-black font-serif text-amber-100">
            هيكل قاعدة البيانات والعلاقات (Database Schema)
          </h2>
          <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
            تصميم موحد يتضمن جداول العملاء، أوامر الشغل، تفاصيل الورش (المقاسات والدهانات والتنجيد ورقم ה-Batch)، والمرفقات مع العلاقات وشروط التكامل المرجعي (Foreign Keys & Cascades).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-1 bg-amber-900/80 border border-amber-700/50 rounded-lg flex items-center gap-1">
            <button
              onClick={() => setDbEngine('postgresql')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                dbEngine === 'postgresql'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              PostgreSQL / Supabase
            </button>
            <button
              onClick={() => setDbEngine('sqlite')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                dbEngine === 'sqlite'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              SQLite
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم نسخ الكود!' : 'نسخ كود SQL'}</span>
          </button>
        </div>
      </div>

      {/* VISUAL ERD DIAGRAM MAP */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-700" />
          <span>مخطط العلاقات المرئي (Visual ERD Diagram)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Table 1: Customers */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3 bg-amber-900 text-amber-100 font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Table className="w-4 h-4 text-amber-300" />
                <span>1. customers (العملاء)</span>
              </span>
              <span className="font-mono text-[10px] text-amber-300">PK: id</span>
            </div>
            <div className="p-3 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                <span className="flex items-center gap-1"><Key className="w-3 h-3" /> id</span>
                <span className="text-[10px]">UUID (PK)</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>name</span>
                <span className="text-[10px] text-slate-400">VARCHAR(255)</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-bold">
                <span>phone</span>
                <span className="text-[10px] text-slate-400">VARCHAR(50) [UQ]</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>address</span>
                <span className="text-[10px] text-slate-400">TEXT</span>
              </div>
            </div>
          </div>

          {/* Table 2: Job Orders */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-amber-600 dark:border-amber-700 overflow-hidden shadow-2xs">
            <div className="p-3 bg-amber-950 text-amber-100 font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Table className="w-4 h-4 text-amber-400" />
                <span>2. job_orders (أوامر الشغل)</span>
              </span>
              <span className="font-mono text-[10px] text-amber-400">PK: id</span>
            </div>
            <div className="p-3 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                <span className="flex items-center gap-1"><Key className="w-3 h-3" /> id</span>
                <span className="text-[10px]">UUID (PK)</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-bold">
                <span>order_number</span>
                <span className="text-[10px] text-slate-400">VARCHAR [UQ]</span>
              </div>
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 p-1 rounded">
                <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> customer_id</span>
                <span className="text-[10px]">FK -&gt; customers</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>room_model_code</span>
                <span className="text-[10px] text-slate-400">VARCHAR</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>contract_date / delivery</span>
                <span className="text-[10px] text-slate-400">DATE</span>
              </div>
              <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-bold">
                <span>status</span>
                <span className="text-[10px]">ENUM</span>
              </div>
            </div>
          </div>

          {/* Table 3: Job Details */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-800 text-slate-100 font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Table className="w-4 h-4 text-amber-300" />
                <span>3. job_details (تفاصيل الورش)</span>
              </span>
              <span className="font-mono text-[10px] text-amber-300">PK: id</span>
            </div>
            <div className="p-3 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                <span className="flex items-center gap-1"><Key className="w-3 h-3" /> id</span>
                <span className="text-[10px]">UUID (PK)</span>
              </div>
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 p-1 rounded">
                <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> job_order_id</span>
                <span className="text-[10px]">FK (1:1) [CASCADE]</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>dimensions_cm</span>
                <span className="text-[10px] text-slate-400">TEXT</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>paint_details</span>
                <span className="text-[10px] text-slate-400">TEXT</span>
              </div>
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 p-1 rounded">
                <span>batch_number</span>
                <span className="text-[10px]">VARCHAR (Batch #)</span>
              </div>
            </div>
          </div>

          {/* Table 4: Attachments */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-800 text-slate-100 font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Table className="w-4 h-4 text-amber-300" />
                <span>4. attachments (المرفقات)</span>
              </span>
              <span className="font-mono text-[10px] text-amber-300">PK: id</span>
            </div>
            <div className="p-3 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                <span className="flex items-center gap-1"><Key className="w-3 h-3" /> id</span>
                <span className="text-[10px]">UUID (PK)</span>
              </div>
              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 p-1 rounded">
                <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> job_order_id</span>
                <span className="text-[10px]">FK (1:N) [CASCADE]</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>file_type</span>
                <span className="text-[10px] text-slate-400">ENUM</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>file_url</span>
                <span className="text-[10px] text-slate-400">TEXT</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SYNTAX HIGHLIGHTED CODE BOX */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-700" />
            <span>كود SQL الكامل للإنشاء التشغيلي ({dbEngine === 'postgresql' ? 'Supabase / PostgreSQL' : 'SQLite'})</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">schema.sql</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 font-mono text-xs shadow-xl">
          <pre className="p-6 overflow-x-auto leading-relaxed scrollbar-thin text-amber-100/90 dir-ltr text-left">
            <code>{activeScript}</code>
          </pre>
        </div>
      </div>

    </div>
  );
};
