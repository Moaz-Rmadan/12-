import React, { useState } from 'react';
import { JobOrderPopulated } from '../types';
import { Bot, Send, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AiAssistantProps {
  orders: JobOrderPopulated[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ orders }) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'مرحباً بك! أنا مساعد الورشة الذكي لمصنع النجار ديزاين. اختر أي أمر شغل وسأقوم بمراجعة المقاسات، نوع الخشب، مطابقة رقم الـ Batch للأقمشة، وتوفير نصائح تقنية للورشة.',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = prompt.trim();
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          orderContext: selectedOrder
            ? {
                order_number: selectedOrder.order_number,
                general_specs: selectedOrder.general_specs,
                dimensions: selectedOrder.job_details?.dimensions_cm,
                wood_type: selectedOrder.job_details?.wood_type,
                paint_details: selectedOrder.job_details?.paint_details,
                color_code: selectedOrder.job_details?.color_code,
                batch_number: selectedOrder.job_details?.batch_number,
              }
            : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorText = data.message || data.error || 'عذراً، تعذر الاتصال بمساعد الورشة الذكي.';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `⚠️ ${errorText}` },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply || 'تم استلام الاستفسارات وتدقيق البيانات.' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'عذراً، تعذر الاتصال بالمساعد الذكي في الوقت الحالي. يرجى التحقق من اتصال الشبكة وإعداد المفتاح المخصص.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'هل رقم الـ Batch المعتمد متوافق مع كمية القماش لغرفة النوم؟',
    'ما هي أفضل طبقة حماية لدهان الأستر لمنع التبصيم؟',
    'راجع المقاسات الموضحة ومدى مناسبتها لمساحة المدخل والتركيب.',
  ];

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-amber-50 p-6 rounded-2xl border border-amber-800/40 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI Workshop Quality & Batch Assistant</span>
          </div>
          <h2 className="text-xl font-black font-serif text-amber-100">
            مساعد الورشة الذكي لمصنع النجار ديزاين
          </h2>
          <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
            استخدم نموذج الجيل الجديد للذكاء الاصطناعي لفحص مواصفات أمر الشغل، مطابقة أكواب القماش والـ Batch، وتقييم أبعاد الأثاث والدهانات.
          </p>
        </div>

        {/* Order Context Selector */}
        <div className="flex items-center gap-2 bg-amber-900/60 p-2 rounded-xl border border-amber-700/50">
          <span className="text-xs text-amber-200 font-bold whitespace-nowrap">السياق المترابط:</span>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="text-xs bg-slate-900 border border-amber-600/50 rounded-lg px-3 py-1.5 font-bold text-amber-100 cursor-pointer"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} - {o.general_specs.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Order Context Snapshot */}
      {selectedOrder && (
        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-slate-800/40 border border-amber-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-bold text-amber-950 dark:text-amber-200">
              بيانات أمر الشغل النشط ({selectedOrder.order_number}):
            </span>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              {selectedOrder.general_specs}
            </p>
          </div>

          <div className="flex items-center gap-4 font-mono font-bold text-slate-700 dark:text-slate-300">
            <span>المقاسات: {selectedOrder.job_details?.dimensions_cm}</span>
            <span className="text-amber-700 dark:text-amber-400">
              Batch: {selectedOrder.job_details?.batch_number}
            </span>
          </div>
        </div>
      )}

      {/* Chat Messages Viewport */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 space-y-4 max-h-[500px] overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-amber-800 text-amber-100 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-800 text-amber-50 font-semibold rounded-br-none'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-400 font-bold p-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>جاري تحليل المواصفات ومطابقة درجات اللون...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap">أسئلة سريعة:</span>
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => setPrompt(q)}
            className="px-3 py-1 rounded-full text-xs bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-slate-700 hover:bg-amber-100 transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="flex items-center gap-3">
        <input
          type="text"
          placeholder="اكتب استفسارك لمهندس الجودة والورشة..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 px-4 py-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
        />

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-5 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-900 hover:to-slate-900 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <Send className="w-4 h-4" />
          <span>إرسال</span>
        </button>
      </form>

    </div>
  );
};
