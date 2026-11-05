import React, { useState, useMemo, useEffect } from 'react';
import { Customer, JobOrderPopulated, TruckManifest, TruckManifestItem } from '../types';
import { initialTruckManifests } from '../data/truckManifestData';
import { printElementById } from '../utils/printHelper';
import {
  Truck,
  Plus,
  Trash2,
  Printer,
  Save,
  Check,
  User,
  Calendar,
  Sparkles,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
  Building,
  ChevronDown,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface TruckManifestStudioProps {
  customers: Customer[];
  orders: JobOrderPopulated[];
  manifests?: TruckManifest[];
  onSaveManifestToDb?: (manifest: TruckManifest) => Promise<void>;
}

export const TruckManifestStudio: React.FC<TruckManifestStudioProps> = ({
  customers,
  orders,
  manifests,
  onSaveManifestToDb,
}) => {
  // All manifests list
  const [manifestsList, setManifestsList] = useState<TruckManifest[]>(() => manifests || initialTruckManifests);

  // Sync manifests from props
  useEffect(() => {
    if (manifests && manifests.length > 0) {
      setManifestsList(manifests);
    }
  }, [manifests]);

  // Active Selected Manifest
  const [selectedManifestId, setSelectedManifestId] = useState<string>(initialTruckManifests[0].id);

  const activeManifest = useMemo(() => {
    return manifestsList.find((m) => m.id === selectedManifestId) || manifestsList[0];
  }, [manifestsList, selectedManifestId]);

  // Form State for active manifest
  const [truckNumber, setTruckNumber] = useState<string>(activeManifest.truckNumber);
  const [driverName, setDriverName] = useState<string>(activeManifest.driverName);
  const [tripDate, setTripDate] = useState<string>(activeManifest.tripDate);
  const [tripDay, setTripDay] = useState<string>(activeManifest.tripDay);
  const [items, setItems] = useState<TruckManifestItem[]>(activeManifest.items);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Keep form in sync when changing selected manifest
  useEffect(() => {
    setTruckNumber(activeManifest.truckNumber);
    setDriverName(activeManifest.driverName);
    setTripDate(activeManifest.tripDate);
    setTripDay(activeManifest.tripDay);
    setItems(activeManifest.items);
    setSavedSuccess(false);
  }, [selectedManifestId, activeManifest]);

  // New Item Input State
  const [newItemCustomer, setNewItemCustomer] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemDetails, setNewItemDetails] = useState<string>('');
  const [newItemNotes, setNewItemNotes] = useState<string>('الدهان كماهو بالمعرض');
  const [newItemSalesperson, setNewItemSalesperson] = useState<string>('م/ بشير النجار');
  const [newItemType, setNewItemType] = useState<'delivery' | 'return'>('delivery');
  const [newItemReturnReason, setNewItemReturnReason] = useState<string>('صيانة دهان وتعديل');

  // Handle Quick Customer / Order Populate
  const handleSelectCustomerForNewItem = (custName: string) => {
    setNewItemCustomer(custName);
    // Find customer orders to pre-fill item name & specs
    const custOrd = orders.find((o) => o.customer?.name?.trim() === custName.trim());
    if (custOrd) {
      setNewItemName(custOrd.room_model_code || custOrd.general_specs);
      setNewItemDetails(custOrd.general_specs);
      if (custOrd.job_details?.paint_details) {
        setNewItemNotes(custOrd.job_details.paint_details);
      }
      if (custOrd.general_specs?.includes('مروان') || custOrd.order_number?.includes('MAZEN') || custName.includes('مازن')) {
        setNewItemSalesperson('م/ مروان هلال');
      } else if (custOrd.general_specs?.includes('بشير')) {
        setNewItemSalesperson('م/ بشير النجار');
      } else {
        setNewItemSalesperson('م/ محمد عبد الله');
      }
    }
  };

  // Add Item to Manifest
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCustomer.trim() || !newItemName.trim()) return;

    const isReturn = newItemType === 'return';
    const computedNotes = isReturn
      ? `[ 🔁 مرتجع للورشة ] ${newItemReturnReason ? `- السبب: ${newItemReturnReason.trim()}` : ''}`
      : (newItemNotes.trim() || 'الدهان كماهو بالمعرض');

    const newItem: TruckManifestItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerName: newItemCustomer.trim(),
      qty: Number(newItemQty) || 1,
      itemName: newItemName.trim(),
      specsDetails: newItemDetails.trim() || (isReturn ? 'استلام مرتجع من العميل' : '-'),
      notes: computedNotes,
      salesperson: newItemSalesperson.trim() || 'إدارة الورشة',
      itemType: newItemType,
      returnReason: isReturn ? newItemReturnReason.trim() : undefined,
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);

    // Reset inputs
    setNewItemName('');
    setNewItemDetails('');
  };

  // Remove Item
  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Item field change inside active manifest
  const handleItemFieldChange = (id: string, field: keyof TruckManifestItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  // Create Brand New Empty Trip Manifest
  const handleCreateNewTrip = () => {
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const newManifest: TruckManifest = {
      id: `manifest-${Date.now()}`,
      tripDate: todayStr,
      tripDay: 'الخميس',
      truckNumber: `${Math.floor(1000 + Math.random() * 9000)}`,
      driverName: 'عصام',
      items: [
        {
          id: `item-${Date.now()}-1`,
          customerName: 'عميل جديد',
          qty: 1,
          itemName: 'غرفة نوم روما',
          specsDetails: 'مكونة من دولاب + سرير + 2 كمود',
          notes: 'الدهان كماهو بالمعرض',
          salesperson: 'م/ بشير النجار',
        },
      ],
    };

    setManifestsList((prev) => [newManifest, ...prev]);
    setSelectedManifestId(newManifest.id);
  };

  // Save Active Manifest
  const handleSaveManifest = async () => {
    const updatedManifest: TruckManifest = {
      id: activeManifest.id,
      tripDate,
      tripDay,
      truckNumber,
      driverName,
      items,
      updatedAt: new Date().toISOString(),
    };

    setManifestsList((prev) =>
      prev.map((m) => (m.id === activeManifest.id ? updatedManifest : m))
    );

    if (onSaveManifestToDb) {
      await onSaveManifestToDb(updatedManifest);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Print Handlers with Single-Page A4 Guarantee
  const handlePrintManifest = (orientation: 'portrait' | 'landscape' = 'portrait') => {
    printElementById('printable-truck-manifest', orientation);
  };

  // Group items by customer for merged table rendering matching the uploaded image
  const groupedCustomerRows = useMemo(() => {
    const groups: Array<{
      customerName: string;
      salesperson: string;
      itemsList: TruckManifestItem[];
    }> = [];

    const map = new Map<string, TruckManifestItem[]>();
    items.forEach((it) => {
      const key = it.customerName.trim();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(it);
    });

    map.forEach((itemList, custName) => {
      groups.push({
        customerName: custName,
        salesperson: itemList[0]?.salesperson || 'إدارة الورشة',
        itemsList: itemList,
      });
    });

    return groups;
  }, [items]);

  // Total characters count across all items in manifest
  const totalTextChars = useMemo(() => {
    return items.reduce((acc, it) => {
      return (
        acc +
        (it.customerName?.length || 0) +
        (it.itemName?.length || 0) +
        (it.specsDetails?.length || 0) +
        (it.notes?.length || 0)
      );
    }, 0);
  }, [items]);

  // Density override state: 'auto' | 'spacious' | 'comfortable' | 'balanced' | 'compact' | 'micro'
  const [densityOverride, setDensityOverride] = useState<'auto' | 'spacious' | 'comfortable' | 'balanced' | 'compact' | 'micro'>('auto');

  // Automatic density detection:
  // - If few items & short text -> 'spacious' (Enlarges font & row height to fully fill the page)
  // - If 5 to 8 items -> 'comfortable'
  // - If 9 to 13 items -> 'balanced'
  // - If 14 to 17 items -> 'compact'
  // - If 18+ items or extreme text -> 'micro'
  const autoDetectedDensity = useMemo<'spacious' | 'comfortable' | 'balanced' | 'compact' | 'micro'>(() => {
    const count = items.length;
    if (count <= 4 && totalTextChars < 340) return 'spacious';
    if (count <= 8 && totalTextChars < 750) return 'comfortable';
    if (count <= 13 && totalTextChars < 1300) return 'balanced';
    if (count <= 17 && totalTextChars < 1850) return 'compact';
    return 'micro';
  }, [items.length, totalTextChars]);

  const activeDensity = densityOverride === 'auto' ? autoDetectedDensity : densityOverride;

  // Screen and print layout density mapping
  const manifestDensity = useMemo(() => {
    switch (activeDensity) {
      case 'spacious':
        return {
          containerPadding: 'p-6 sm:p-8',
          headerPad: 'p-2 sm:p-2.5',
          headerText: 'text-sm sm:text-base',
          brandLogoText: 'text-2xl font-black',
          brandTitleText: 'text-2xl sm:text-3xl font-extrabold',
          metaRowText: 'text-sm sm:text-base font-bold',
          tableTh: 'p-3 sm:p-3.5 text-base font-black',
          tableTd: 'p-3 sm:p-4 text-sm sm:text-base leading-relaxed',
          custName: 'text-base sm:text-lg font-black',
          spacingY: 'space-y-4',
          footerPad: 'pt-4 mt-6 text-sm',
          minRowHeight: 'min-h-[55px]',
        };
      case 'comfortable':
        return {
          containerPadding: 'p-4 sm:p-6',
          headerPad: 'p-1.5 sm:p-2',
          headerText: 'text-xs sm:text-sm',
          brandLogoText: 'text-xl font-black',
          brandTitleText: 'text-xl sm:text-2xl font-extrabold',
          metaRowText: 'text-xs sm:text-sm font-bold',
          tableTh: 'p-2 sm:p-2.5 text-sm font-black',
          tableTd: 'p-2 sm:p-2.5 text-xs sm:text-sm leading-normal',
          custName: 'text-sm sm:text-base font-black',
          spacingY: 'space-y-3',
          footerPad: 'pt-3 mt-4 text-xs sm:text-sm',
          minRowHeight: 'min-h-[42px]',
        };
      case 'balanced':
        return {
          containerPadding: 'p-3 sm:p-4',
          headerPad: 'p-1 sm:p-1.5',
          headerText: 'text-[11px] sm:text-xs',
          brandLogoText: 'text-base font-black',
          brandTitleText: 'text-lg font-extrabold',
          metaRowText: 'text-[11px] sm:text-xs font-bold',
          tableTh: 'p-1.5 text-xs font-black',
          tableTd: 'p-1.5 text-[11px] sm:text-xs leading-snug',
          custName: 'text-xs font-black',
          spacingY: 'space-y-2',
          footerPad: 'pt-2 mt-2.5 text-xs',
          minRowHeight: 'min-h-[32px]',
        };
      case 'compact':
        return {
          containerPadding: 'p-2 sm:p-3',
          headerPad: 'p-0.5 sm:p-1',
          headerText: 'text-[10px] sm:text-[10.5px]',
          brandLogoText: 'text-sm font-black',
          brandTitleText: 'text-base font-extrabold',
          metaRowText: 'text-[10px] sm:text-[10.5px] font-bold',
          tableTh: 'p-1 text-[10px] font-black',
          tableTd: 'p-1 text-[9.5px] sm:text-[10px] leading-tight',
          custName: 'text-[10px] font-black',
          spacingY: 'space-y-1.5',
          footerPad: 'pt-1.5 mt-1.5 text-[10px]',
          minRowHeight: 'min-h-[26px]',
        };
      case 'micro':
      default:
        return {
          containerPadding: 'p-1.5 sm:p-2',
          headerPad: 'p-0.5',
          headerText: 'text-[9px] sm:text-[9.5px]',
          brandLogoText: 'text-xs font-black',
          brandTitleText: 'text-sm font-extrabold',
          metaRowText: 'text-[9px] sm:text-[9.5px]',
          tableTh: 'p-0.5 text-[9px] font-black',
          tableTd: 'p-0.5 text-[8.5px] sm:text-[9px] leading-tight',
          custName: 'text-[9px] font-black',
          spacingY: 'space-y-1',
          footerPad: 'pt-1 mt-1 text-[9px]',
          minRowHeight: 'min-h-[22px]',
        };
    }
  }, [activeDensity]);

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* TOP HEADER & ACTION BANNER */}
      <div className="no-print bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-amber-50 p-4 sm:p-6 rounded-2xl border border-amber-800/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Truck Cargo Manifest &amp; Delivery Logistics</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black font-serif text-white">
              بيـان وسـجل حمـولـة السـيارة (حمولة العربية)
            </h2>
            <p className="text-xs text-amber-200/80 mt-0.5 max-w-xl">
              تصفح وأنشئ بيانات شحن حمولة السيارات للعملاء، واطبع كشف الحمولة كاملاً في صفحة واحدة A4 دون أي ترحيل للصفوف!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-amber-800/60 shrink-0">
          <button
            onClick={handleCreateNewTrip}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-200 bg-amber-950/80 border border-amber-800 hover:bg-amber-900 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>بيان جديد</span>
          </button>

          <button
            onClick={handleSaveManifest}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-sm transition-all cursor-pointer"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'تم الحفظ!' : 'حفظ'}</span>
          </button>

          <button
            onClick={() => handlePrintManifest('portrait')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-amber-700 hover:bg-amber-600 shadow-md transition-all cursor-pointer"
            title="طباعة بيان الحمولة كاملاً في صفحة A4 واحدة"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة صفحة واحدة (A4)</span>
          </button>

          <button
            onClick={() => handlePrintManifest('landscape')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold text-amber-200 bg-slate-900 hover:bg-slate-800 border border-amber-700/50 transition-colors cursor-pointer"
            title="طباعة بنمط أفقي عريض"
          >
            <span>أفقي</span>
          </button>
        </div>
      </div>

      {/* MANIFEST SELECTOR & METADATA EDITOR BAR */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        
        {/* Row 1: Search and Select Trip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <label className="text-xs font-black text-slate-800 dark:text-slate-200">
              بحث عن بيان حمولة (بالتاريخ، رقم السيارة، أو اسم العميل):
            </label>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="اكتب للبحث..."
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex-1 sm:min-w-[200px]"
              onChange={(e) => {
                const term = e.target.value.toLowerCase();
                const filtered = manifestsList.filter(m => 
                  m.tripDate.toLowerCase().includes(term) ||
                  m.truckNumber.toLowerCase().includes(term) ||
                  m.driverName.toLowerCase().includes(term) ||
                  m.items.some(it => it.customerName.toLowerCase().includes(term))
                );
                if (filtered.length > 0) setSelectedManifestId(filtered[0].id);
              }}
            />
            <select
              value={selectedManifestId}
              onChange={(e) => setSelectedManifestId(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer w-full sm:w-auto"
            >
              {manifestsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.tripDate} - سيارة {m.truckNumber} ({m.driverName}) - [{m.items.length} صنف]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Editable Metadata Fields (Truck #, Driver, Date, Day) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              رقم السيارة:
            </label>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              className="w-full px-3 py-2 font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم السواق:
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-3 py-2 font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              تاريخ الرحلة:
            </label>
            <input
              type="text"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              className="w-full px-3 py-2 font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              اليوم:
            </label>
            <input
              type="text"
              value={tripDay}
              onChange={(e) => setTripDay(e.target.value)}
              className="w-full px-3 py-2 font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Row 3: Add Cargo Item Form & Smart Customer Order Picker */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
          
          {/* Smart Customer Order Quick Picker Bar */}
          <div className="bg-amber-50/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-amber-200/80 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                  مستورد أوردرات العملاء الذكي (اختيار العميل وأوردراته بنقرة واحدة):
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={newItemCustomer}
                  onChange={(e) => handleSelectCustomerForNewItem(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer min-w-[220px] shadow-2xs"
                >
                  <option value="">-- اختر العميل من القائمة --</option>
                  <option value="المعرض">🏬 المعرض (بضاعة المعرض)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      👤 {c.name} ({c.phone || 'بدون تليفون'})
                    </option>
                  ))}
                </select>

                {newItemCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      const custOrds = orders.filter((o) => o.customer?.name?.trim() === newItemCustomer.trim());
                      if (custOrds.length === 0) {
                        // Create standard sample item for this customer if no existing job orders found
                        setItems((prev) => [
                          ...prev,
                          {
                            id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            customerName: newItemCustomer.trim(),
                            qty: 1,
                            itemName: 'أوردر عميل جديد',
                            specsDetails: 'تفاصيل ومواصفات الأوردر',
                            notes: 'الدهان كماهو بالمعرض',
                            salesperson: 'م/ بشير النجار',
                          },
                        ]);
                        return;
                      }

                      const newItemsToAdd: TruckManifestItem[] = custOrds.map((ord, idx) => ({
                        id: `item-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
                        customerName: newItemCustomer.trim(),
                        qty: 1,
                        itemName: ord.room_model_code || ord.order_number || 'منتج خشبي',
                        specsDetails: ord.general_specs || 'مواصفات خاصة',
                        notes: ord.job_details?.paint_details || 'الدهان كماهو بالمعرض',
                        salesperson:
                          ord.general_specs?.includes('مروان') || ord.order_number?.includes('MAZEN') || newItemCustomer.includes('مازن')
                            ? 'م/ مروان هلال'
                            : ord.general_specs?.includes('بشير')
                            ? 'م/ بشير النجار'
                            : 'م/ محمد عبد الله',
                      }));

                      setItems((prev) => [...prev, ...newItemsToAdd]);
                    }}
                    className="px-3 py-1.5 text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة كل أوردرات {newItemCustomer} للحمولة</span>
                  </button>
                )}
              </div>
            </div>

            {/* List of customer's active orders if selected */}
            {newItemCustomer && (
              <div className="pt-2 border-t border-amber-200/60 dark:border-slate-700/60">
                {(() => {
                  const custOrds = orders.filter((o) => o.customer?.name?.trim() === newItemCustomer.trim());
                  if (custOrds.length === 0) {
                    return (
                      <p className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-400">
                        لا تتوفر أوامر شغل مسجلة سابقاً لهذا العميل. يمكنك كتابة الأصناف والتفاصيل مباشرة في النموذج أدناه.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        أوامر شغل المسجلة لـ ({newItemCustomer}): اضغط على أي أوردر لإضافته مباشرة للحمولة
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {custOrds.map((ord) => (
                          <button
                            key={ord.id}
                            type="button"
                            onClick={() => {
                              const singleItem: TruckManifestItem = {
                                id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                customerName: newItemCustomer.trim(),
                                qty: 1,
                                itemName: ord.room_model_code || ord.order_number || 'منتج جديد',
                                specsDetails: ord.general_specs || 'بدون تفاصيل',
                                notes: ord.job_details?.paint_details || 'الدهان كماهو بالمعرض',
                                salesperson:
                                  ord.general_specs?.includes('مروان') || ord.order_number?.includes('MAZEN') || newItemCustomer.includes('مازن')
                                    ? 'م/ مروان هلال'
                                    : ord.general_specs?.includes('بشير')
                                    ? 'م/ بشير النجار'
                                    : 'م/ محمد عبد الله',
                              };
                              setItems((prev) => [...prev, singleItem]);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-amber-500 hover:bg-amber-100/50 cursor-pointer shadow-2xs transition-all"
                          >
                            <span className="text-amber-700 dark:text-amber-400 font-mono">#{ord.order_number}</span>
                            <span>{ord.room_model_code || 'أوردر'}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({ord.status})</span>
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <form onSubmit={handleAddItem} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  إضافة صنف أو مرتجع يدوياً للبيان:
                </span>

                {/* Operation Type Toggle (Delivery vs Return) */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 me-2">
                  <button
                    type="button"
                    onClick={() => setNewItemType('delivery')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      newItemType === 'delivery'
                        ? 'bg-amber-900 text-amber-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    📦 تسليم عميل
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewItemType('return')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      newItemType === 'return'
                        ? 'bg-rose-700 text-white shadow-xs font-extrabold'
                        : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50'
                    }`}
                  >
                    🔁 مرتجع للورشة
                  </button>
                </div>
              </div>

              {/* Quick Customer Select Pills */}
              {customers.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-md">
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">اختيار سريع:</span>
                  <button
                    type="button"
                    onClick={() => handleSelectCustomerForNewItem('المعرض')}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 shrink-0 cursor-pointer"
                  >
                    + المعرض
                  </button>
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomerForNewItem(c.name)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  required
                  placeholder="اسم العميل (أو المعرض)"
                  value={newItemCustomer}
                  onChange={(e) => setNewItemCustomer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  required
                  placeholder="اسم المنتج (مثال: مكتبة، ركنة، انتريه...)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              {newItemType === 'delivery' ? (
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="البيان والتفاصيل"
                    value={newItemDetails}
                    onChange={(e) => setNewItemDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              ) : (
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="سبب المرتجع (مثال: صيانة دهان، تعديل مقاس...)"
                    value={newItemReturnReason}
                    onChange={(e) => setNewItemReturnReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 font-bold"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="اسم السيلز"
                  value={newItemSalesperson}
                  onChange={(e) => setNewItemSalesperson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className={`w-full h-full py-2 text-white font-bold rounded-xl flex items-center justify-center cursor-pointer shadow-xs transition-colors ${
                    newItemType === 'return' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-amber-800 hover:bg-amber-900'
                  }`}
                >
                  {newItemType === 'return' ? '+ مرتجع' : '+ إضافة'}
                </button>
              </div>
            </div>

          </form>

          {/* Active Items Quick List Manager & Delete */}
          {items.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  قائمة الأصناف بالبيان الحالي ({items.length} صنف) - يمكنك حذف أي صنف بالضغط على سلة المهملات:
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {items.map((it) => {
                  const isRet = it.itemType === 'return' || it.notes.includes('مرتجع');
                  return (
                    <div
                      key={it.id}
                      className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        isRet
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isRet && <span className="text-[10px] font-black text-rose-600">🔁 مرتجع</span>}
                      <span>{it.customerName}:</span>
                      <span className="font-extrabold">{it.itemName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer me-0.5"
                        title="حذف هذا الصنف من البيان"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* PRINTABLE HIGH-FIDELITY TRUCK MANIFEST SHEET - ADAPTIVE FULL-PAGE FIT */}
      <div className="space-y-3">
        {/* Helper info bar & adaptive density switcher above preview */}
        <div className="no-print bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl p-3.5 shadow-sm space-y-3">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-xs" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-950 dark:text-emerald-200 text-sm">
                    الملاءمة التلقائية لصفحة الطباعة (ملء الصفحة بذكاء):
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                    {activeDensity === 'spacious' && '🔍 ملء مكبر (بيانات قليلة - خط كبير وواضح)'}
                    {activeDensity === 'comfortable' && '📄 مريح متوازن (خط متوسط متناسق)'}
                    {activeDensity === 'balanced' && '⚖️ قياسي مطابق للمصنع'}
                    {activeDensity === 'compact' && '📐 مضغوط ذكي (بيانات كثيرة في صفحة واحدة)'}
                    {activeDensity === 'micro' && '⚡ كثافة قصوى (أوردرات ضخمة جداً)'}
                  </span>
                </div>
                <p className="font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                  {activeDensity === 'spacious'
                    ? 'نظراً لقلة الأصناف والكتابة، تم تكبير الخطوط والصفوف آلياً لتشغل ورقة A4 كاملة دون فراغات بيضاء بالأسفل.'
                    : activeDensity === 'compact' || activeDensity === 'micro'
                    ? 'نظراً لكثرة الأصناف والكتابة، تم تصغير الخطوط والهوامش بنسب دقيقة لتتسع بالكامل في صفحة واحدة دون ترحيل.'
                    : 'حجم الخطوط والهوامش متوازن ومضبوط تماماً لملء ورقة A4 واحدة.'}
                  {' '}<span className="text-amber-800 dark:text-amber-400 font-mono font-bold">({items.length} صنف | {groupedCustomerRows.length} عملاء | {totalTextChars} حرف)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintManifest('portrait')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all cursor-pointer"
                title="طباعة بيان الحمولة المتأقلم في صفحة A4 واحدة"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة البيان (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintManifest('landscape')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="طباعة بنمط أفقي عريض"
              >
                <span>أفقي</span>
              </button>
            </div>
          </div>

          {/* Density Mode Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-200/60 dark:border-slate-700/60 text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              التحكم اليدوي بحجم الخط وملء الصفحة:
            </span>

            <button
              type="button"
              onClick={() => setDensityOverride('auto')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                densityOverride === 'auto'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50'
              }`}
            >
              🤖 تأقلم تلقائي ذكي {densityOverride === 'auto' && `(${activeDensity})`}
            </button>

            <button
              type="button"
              onClick={() => setDensityOverride('spacious')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                densityOverride === 'spacious'
                  ? 'bg-amber-600 text-white font-black shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-amber-50'
              }`}
            >
              🔍 تكبير وملء الصفحة (كتابة قليلة)
            </button>

            <button
              type="button"
              onClick={() => setDensityOverride('comfortable')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                densityOverride === 'comfortable'
                  ? 'bg-amber-600 text-white font-black shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-amber-50'
              }`}
            >
              📄 خط مريح متسع
            </button>

            <button
              type="button"
              onClick={() => setDensityOverride('balanced')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                densityOverride === 'balanced'
                  ? 'bg-amber-600 text-white font-black shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-amber-50'
              }`}
            >
              ⚖️ عادي قياسي
            </button>

            <button
              type="button"
              onClick={() => setDensityOverride('compact')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                densityOverride === 'compact'
                  ? 'bg-amber-600 text-white font-black shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-amber-50'
              }`}
            >
              📐 مضغوط (كتابة كثيرة)
            </button>

            <button
              type="button"
              onClick={() => setDensityOverride('micro')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                densityOverride === 'micro'
                  ? 'bg-amber-600 text-white font-black shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-amber-50'
              }`}
            >
              ⚡ أقصى كثافة
            </button>
          </div>

        </div>

        <div className="flex justify-center p-2 sm:p-4 bg-slate-100 dark:bg-slate-950 overflow-x-auto">
          
          <div
            id="printable-truck-manifest"
            className={`bg-white text-black density-${activeDensity} ${manifestDensity.containerPadding} rounded-none border-2 sm:border-3 border-slate-950 shadow-2xl max-w-[210mm] w-full font-serif text-slate-950 relative flex flex-col justify-between my-auto`}
            style={{
              color: '#000000',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              pageBreakInside: 'avoid',
              pageBreakAfter: 'avoid',
              pageBreakBefore: 'avoid',
              breakInside: 'avoid',
              width: '100%',
              maxWidth: '210mm',
              minHeight: '272mm',
            }}
          >

            {/* DOCUMENT BODY */}
            <div className={`manifest-content-wrapper flex-1 flex flex-col ${manifestDensity.spacingY}`}>
              
              {/* 1. MANIFEST BRAND HEADER TABLE GRID (MATCHING ORIGINAL IMAGE) */}
              <div className="manifest-header-block border-2 border-slate-950 rounded-none overflow-hidden shrink-0">
                <div className={`grid grid-cols-12 text-center font-bold border-b-2 border-slate-950 bg-white ${manifestDensity.headerText}`}>
                  <div className={`col-span-3 ${manifestDensity.headerPad} border-l-2 border-slate-950 flex items-center justify-center font-black ${manifestDensity.brandLogoText} font-serif`}>
                    A
                  </div>
                  <div className={`col-span-6 ${manifestDensity.headerPad} border-l-2 border-slate-950 flex items-center justify-center font-extrabold ${manifestDensity.brandTitleText} font-serif`}>
                    Alnajar
                  </div>
                  <div className={`col-span-3 ${manifestDensity.headerPad} flex items-center justify-center font-black ${manifestDensity.brandTitleText} font-serif text-amber-900`}>
                    النجار فيرنتشر
                  </div>
                </div>

                {/* Trip Header Metadata Grid */}
                <div className={`grid grid-cols-12 text-center font-bold bg-white ${manifestDensity.metaRowText}`}>
                  
                  {/* Col 1 */}
                  <div className={`col-span-3 border-l-2 border-slate-950 ${manifestDensity.headerPad} flex justify-between items-center px-2`}>
                    <span className="font-extrabold">التاريخ /</span>
                    <span className="font-mono font-black dir-ltr">{tripDate}</span>
                  </div>

                  {/* Col 2 */}
                  <div className={`col-span-3 border-l-2 border-slate-950 ${manifestDensity.headerPad} flex items-center justify-center font-black bg-[#fff200] text-black`}>
                    حمولة العربية
                  </div>

                  {/* Col 3 */}
                  <div className={`col-span-3 border-l-2 border-slate-950 ${manifestDensity.headerPad} flex items-center justify-center font-black`}>
                    {tripDay}
                  </div>

                  {/* Col 4 */}
                  <div className={`col-span-3 ${manifestDensity.headerPad} flex justify-between items-center px-2`}>
                    <span className="font-extrabold">اليوم :</span>
                    <span className="font-bold">{tripDay}</span>
                  </div>

                </div>

                <div className={`grid grid-cols-12 text-center font-bold border-t-2 border-slate-950 bg-white ${manifestDensity.metaRowText}`}>
                  
                  <div className={`col-span-3 border-l-2 border-slate-950 ${manifestDensity.headerPad} flex justify-between items-center px-2`}>
                    <span className="font-extrabold">اسم السواق :</span>
                    <span className="font-black text-blue-950">{driverName}</span>
                  </div>

                  <div className={`col-span-3 border-l-2 border-slate-950 ${manifestDensity.headerPad} flex items-center justify-center font-black font-mono`}>
                    {truckNumber}
                  </div>

                  <div className={`col-span-6 ${manifestDensity.headerPad} flex justify-between items-center px-3`}>
                    <span className="font-extrabold">رقم العربية :</span>
                    <span className="font-mono font-black">{truckNumber}</span>
                  </div>

                </div>

              </div>

              {/* 2. CARGO MANIFEST TABLE - YELLOW HEADER ROW WITH EXACT MERGED CUSTOMER BLOCKS */}
              <div className="manifest-table-wrapper flex-1 flex flex-col border-2 border-slate-950 rounded-none overflow-hidden">
                <table className="w-full text-center border-collapse flex-1 h-full">
                  
                  {/* Yellow Column Headers */}
                  <thead>
                    <tr className="bg-[#fff200] text-black font-black border-b-2 border-slate-950">
                      <th className={`${manifestDensity.tableTh} border-l-2 border-slate-950 w-2/12`}>اسم العميل</th>
                      <th className={`${manifestDensity.tableTh} border-l-2 border-slate-950 w-[5%]`}>م</th>
                      <th className={`${manifestDensity.tableTh} border-l-2 border-slate-950 w-3/12`}>الاسم</th>
                      <th className={`${manifestDensity.tableTh} border-l-2 border-slate-950 w-3/12`}>البيان</th>
                      <th className={`${manifestDensity.tableTh} border-l-2 border-slate-950 w-2/12`}>ملاحظات</th>
                      <th className={`${manifestDensity.tableTh} w-2/12`}>اسم السيلز</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y-2 divide-slate-950 font-bold h-full">
                    {groupedCustomerRows.map((group, groupIdx) => {
                      const isExhibition = group.customerName.trim() === 'المعرض';

                      return (
                        <React.Fragment key={groupIdx}>
                          {group.itemsList.map((item, itemIdx) => {
                            const isFirstRowOfGroup = itemIdx === 0;

                            return (
                              <tr
                                key={item.id}
                                className={`border-b border-slate-950 ${manifestDensity.minRowHeight} ${
                                  isExhibition ? 'bg-amber-100/90 font-extrabold' : 'bg-white hover:bg-slate-50'
                                }`}
                                style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                              >
                                
                                {/* 1. Customer Name (Merged Row if multi-item customer) */}
                                {isFirstRowOfGroup && (
                                  <td
                                    rowSpan={group.itemsList.length}
                                    className={`${manifestDensity.tableTd} ${manifestDensity.custName} border-l-2 border-slate-950 align-middle ${
                                      isExhibition ? 'bg-[#fff200] text-black font-black' : 'bg-[#ffffcc]'
                                    }`}
                                  >
                                    {group.customerName}
                                  </td>
                                )}

                                {/* 2. Quantity / Count */}
                                <td className={`${manifestDensity.tableTd} border-l-2 border-slate-950 font-mono font-bold align-middle`}>
                                  {item.qty}
                                </td>

                                {/* 3. Item Name / الاسم */}
                                <td className={`${manifestDensity.tableTd} border-l-2 border-slate-950 text-right pr-2 font-extrabold align-middle text-blue-950`}>
                                  {(item.itemType === 'return' || item.notes.includes('مرتجع')) && (
                                    <span className="inline-block bg-rose-200 text-rose-950 px-1 py-0.2 rounded text-[9px] font-black me-1 border border-rose-400">
                                      🔁 مرتجع
                                    </span>
                                  )}
                                  {item.itemName}
                                </td>

                                {/* 4. Details / البيان */}
                                <td className={`${manifestDensity.tableTd} border-l-2 border-slate-950 text-right pr-2 font-semibold leading-snug align-middle`}>
                                  {item.specsDetails || '-'}
                                </td>

                                {/* 5. Notes / ملاحظات */}
                                <td className={`${manifestDensity.tableTd} border-l-2 border-slate-950 text-center font-bold align-middle ${
                                  item.itemType === 'return' || item.notes.includes('مرتجع')
                                    ? 'bg-rose-100 text-rose-950 font-black'
                                    : ''
                                }`}>
                                  {item.notes}
                                </td>

                                {/* 6. Salesperson Name (Merged Row if multi-item customer) */}
                                {isFirstRowOfGroup && (
                                  <td
                                    rowSpan={group.itemsList.length}
                                    className={`${manifestDensity.tableTd} font-bold align-middle bg-amber-50/50`}
                                  >
                                    {group.salesperson}
                                  </td>
                                )}

                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                </table>
              </div>

            </div>

            {/* FOOTER SIGN-OFF */}
            <div className={`manifest-footer border-t border-slate-400 mt-auto flex items-center justify-between font-bold text-slate-800 ${manifestDensity.footerPad}`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div>توقيع أمين المخزن / المصنع : ...................................</div>
              <div>توقيع السواق الاستلام : <span className="font-extrabold text-slate-950">{driverName}</span></div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
