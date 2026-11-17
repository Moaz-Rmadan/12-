import React, { useState, useEffect } from 'react';
import { JobOrderPopulated } from '../types';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AiAssistantProps {
  orders: JobOrderPopulated[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ orders }) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [prompt, setPrompt] = useState('');
  const { currentUser, isDemoMode } = useAuth();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'مرحباً بك! أنا مساعد الورشة الذكي لمصنع النجار ديزاين. اختر أي أمر شغل وسأقوم بمراجعة المقاسات، نوع الخشب، مطابقة رقم الـ Batch للأقمشة، وتوفير نصائح تقنية للورشة.',
    },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = prompt.trim();
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      let token = '';

      if (!isDemoMode && currentUser) {
        token = await currentUser.getIdToken();
      } else if (isDemoMode) {
        token = 'DEMO_MODE_TOKEN';
      }

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
          { role: 'assistant', text: errorText },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply || 'تم استلام الاستفسار وتدقيق البيانات.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'عذراً، تعذر الاتصال بالمساعد الذكي في الوقت الحالي. يرجى التحقق من اتصال الشبكة وإعدادات الخادم.',
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
      <div className="bg-gradient-to-r from-[#16253B] via-[#233B5D] to-[#1E3352] text-white p-6 rounded-2xl border border-[#4B83B8]/30 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#C6A355] text-xs font-bold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>الفحص الفني ومراجعة المواصفات</span>
          </div>
          <h2 className="text-xl font-black font-serif text-white">
            مساعد الورشة الذكي لمصنع النجار ديزاين
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            استخدم المساعد الفني لفحص مواصفات أمر الشغل، مطابقة أكواد القماش والـ Batch، وتقييم أبعاد الأثاث والدهانات.
          </p>
        </div>

        {/* Order Context Selector */}
        <div className="flex items-center gap-2 bg-[#121E30]/70 p-2 rounded-xl border border-[#4B83B8]/40">
          <span className="text-xs text-slate-200 font-bold whitespace-nowrap">أمر الشغل المرتبط:</span>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="text-xs bg-slate-900 border border-[#4B83B8]/50 rounded-lg px-3 py-1.5 font-bold text-white cursor-pointer max-w-[240px]"
          >
            {orders.length === 0 && <option value="">لا توجد أوامر متاحة</option>}
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
        <div className="p-4 rounded-xl bg-[#EBF3FA]/60 dark:bg-slate-800/40 border border-[#4B83B8]/30 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-bold text-[#16253B] dark:text-[#8CB4D9]">
              بيانات أمر الشغل النشط ({selectedOrder.order_number}):
            </span>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              {selectedOrder.general_specs}
            </p>
          </div>

          <div className="flex items-center gap-4 font-mono font-bold text-slate-700 dark:text-slate-300">
            <span>المقاسات: {selectedOrder.job_details?.dimensions_cm || '—'}</span>
            <span className="text-[#233B5D] dark:text-[#C6A355]">
              Batch: {selectedOrder.job_details?.batch_number || '—'}
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
              <div className="w-8 h-8 rounded-lg bg-[#233B5D] text-[#C6A355] flex items-center justify-center shrink-0 mt-1 border border-[#4B83B8]/30">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#233B5D] text-white font-semibold rounded-br-none'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#233B5D] dark:text-[#8CB4D9] font-bold p-2">
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
            type="button"
            onClick={() => setPrompt(q)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-[#233B5D] dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#4B83B8] hover:bg-[#EBF3FA]/50 transition-colors whitespace-nowrap cursor-pointer shrink-0 font-semibold"
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
          className="flex-1 px-4 py-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4B83B8] shadow-2xs"
        />

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-5 py-3 rounded-xl text-xs font-bold text-white bg-[#233B5D] hover:bg-[#1E3352] disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0 border border-[#4B83B8]/30"
        >
          <Send className="w-4 h-4" />
          <span>إرسال</span>
        </button>
      </form>
    </div>
  );
};
