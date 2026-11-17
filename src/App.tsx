import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/navigation/Sidebar';
import { TopBar } from './components/navigation/TopBar';
import { MobileNavigationDrawer } from './components/navigation/MobileNavigationDrawer';
import { DashboardStats } from './components/DashboardStats';
import { OrderList } from './components/OrderList';
import { WorkshopCardModal } from './components/WorkshopCardModal';
import { OrderFormModal } from './components/OrderFormModal';
import { CustomersManager } from './components/CustomersManager';
import { TemplateStudio } from './components/TemplateStudio';
import { CustomerDeliveryReceiptView } from './components/CustomerDeliveryReceiptView';
import { TruckManifestStudio } from './components/TruckManifestStudio';
import { MonthlyDeliveredReport } from './components/MonthlyDeliveredReport';
import { TopSellingModelsReport } from './components/TopSellingModelsReport';
import { CriticalOverdueReport } from './components/CriticalOverdueReport';
import { BottleneckReport } from './components/BottleneckReport';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { SmartSearchStudio, SmartSearchSeed } from './components/SmartSearchStudio';
import { SmartSearchFilters } from './utils/smartSearchEngine';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeedbackProvider, useFeedback } from './contexts/FeedbackContext';
import { AiAssistant } from './components/AiAssistant';
import { DeliveriesView } from './components/DeliveriesView';
import { ArchiveView } from './components/ArchiveView';
import { isDeliveredActiveOrder } from './utils/orderLifecycle';
import { ALL_NAV_ITEMS } from './components/navigation/navConfig';
import { LoginPage } from './components/auth/LoginPage';
import { AccessDenied } from './components/auth/AccessDenied';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { UserManagementView } from './components/admin/UserManagementView';
import { SettingsView } from './components/SettingsView';
import { canAccessTab, TAB_PERMISSION_MAP } from './lib/permissions';
import { logAuditEvent } from './lib/audit';
import { Hammer } from 'lucide-react';

import {
  subscribeToJobOrders,
  subscribeToCustomers,
  subscribeToTruckManifests,
  saveTruckManifestToFirestore,
  deleteTruckManifestFromFirestore,
  saveJobOrderToFirestore,
  updateJobOrderInFirestore,
  updateOrderStatusInFirestore,
  updateOrderStageInFirestore,
  updateOrderArchiveStatusInFirestore,
  archiveOrdersBatchInFirestore,
  deleteOrderFromFirestore,
  deleteCustomerFromFirestore,
  saveCustomerToFirestore,
  saveBatchCustomersToFirestore,
  saveBatchJobOrdersToFirestore,
  seedWorkshopDataIfMissing,
  subscribeToDeliveryReceipts,
  issueDeliveryReceiptToFirestore,
  deleteDeliveryReceiptFromFirestore,
} from './lib/firebase';

import {
  JobOrderPopulated,
  Customer,
  OrderStatus,
  ProductionStage,
  CreateJobOrderPayload,
  TruckManifest,
  DeliveryReceiptRecord,
} from './types';
import {
  initialCustomers,
  getPopulatedOrders,
} from './data/mockData';
import { initialTruckManifests } from './data/truckManifestData';
import {
  buildDeliveryReceiptRecord,
  generateNextDeliveryReceiptNumber,
  planOrderReceiptLinksAndDeliveryTransitions,
} from './utils/deliveryReceiptLink';

function MainApp() {
  const { currentUser, userProfile, loading, isDeactivated, isDemoMode } = useAuth();
  const { showToast } = useFeedback();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeTab, setActiveTab] = useState<string>('executive-dashboard');
  const [activeFilter, setActiveFilter] = useState<string>('الكل');

  // Sidebar Collapsible & Mobile Drawer state (persisted locally)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('al_najjar_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  const [orders, setOrders] = useState<JobOrderPopulated[]>(() => getPopulatedOrders());
  const [customers, setCustomers] = useState<Customer[]>(() => initialCustomers);
  const [truckManifests, setTruckManifests] = useState<TruckManifest[]>(() => initialTruckManifests);
  const [deliveryReceipts, setDeliveryReceipts] = useState<DeliveryReceiptRecord[]>([]);

  const [selectedOrderForCard, setSelectedOrderForCard] = useState<JobOrderPopulated | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [orderToEdit, setOrderToEdit] = useState<JobOrderPopulated | null>(null);
  const [selectedCustomerForReceiptId, setSelectedCustomerForReceiptId] = useState<string>('');
  const [selectedOrderForReceiptId, setSelectedOrderForReceiptId] = useState<string>('');
  const [smartSearchSeed, setSmartSearchSeed] = useState<SmartSearchSeed | null>(null);

  const handleOpenSmartSearch = (filters: Partial<SmartSearchFilters>) => {
    setSmartSearchSeed({ filters, nonce: Date.now() });
    setActiveTab('smart-search');
  };

  // Save sidebar preference
  const handleToggleSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    try {
      localStorage.setItem('al_najjar_sidebar_collapsed', String(collapsed));
    } catch {
      // ignore
    }
  };


  // Compute urgent orders count for Sidebar & TopBar notifications sync
  const urgentOrdersCount = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return orders.filter((ord) => {
      if (ord.is_archived) return false;
      if (ord.status === 'تسليم') return false;
      if (!ord.delivery_date) return false;

      const parts = ord.delivery_date.split('-');
      if (parts.length !== 3) return false;

      const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - now.getTime();
      const diffHours = diffTime / (1000 * 60 * 60);

      return diffHours <= 48;
    }).length;
  }, [orders]);

  const deliveredOrdersCount = useMemo(
    () => orders.filter(isDeliveredActiveOrder).length,
    [orders]
  );

  // Sync Dark mode with <html> tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auto-redirect to first permitted tab if user lacks access to activeTab
  useEffect(() => {
    if (!userProfile || !userProfile.isActive) return;
    if (!canAccessTab(userProfile, activeTab)) {
      const firstPermitted = ALL_NAV_ITEMS.find((item) => canAccessTab(userProfile, item.id));
      if (firstPermitted) {
        setActiveTab(firstPermitted.id);
      }
    }
  }, [userProfile, activeTab]);

  // Admin-only baseline workshop data seed
  useEffect(() => {
    if (isDemoMode || !currentUser || userProfile?.role !== 'admin') return;
    seedWorkshopDataIfMissing(initialCustomers, getPopulatedOrders()).catch((e) =>
      console.warn('Initial workshop seed check:', e)
    );
  }, [isDemoMode, currentUser?.uid, userProfile?.role]);

  // Firebase Real-time Firestore Sync Listeners
  useEffect(() => {
    if (isDemoMode || !currentUser || !userProfile?.isActive) return;

    const unsubscribeOrders = subscribeToJobOrders((firestoreOrders) => {
      if (firestoreOrders && firestoreOrders.length > 0) {
        setOrders(firestoreOrders);
      }
    });

    const unsubscribeCustomers = subscribeToCustomers((firestoreCustomers) => {
      if (firestoreCustomers && firestoreCustomers.length > 0) {
        setCustomers(firestoreCustomers);
      }
    });

    const unsubscribeManifests = subscribeToTruckManifests((firestoreManifests) => {
      if (firestoreManifests && firestoreManifests.length > 0) {
        setTruckManifests(firestoreManifests);
      }
    });

    const unsubscribeReceipts = subscribeToDeliveryReceipts((firestoreReceipts) => {
      setDeliveryReceipts(firestoreReceipts);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
      unsubscribeManifests();
      unsubscribeReceipts();
    };
  }, [isDemoMode, currentUser?.uid, userProfile?.isActive]);

  // Handle Order Create or Edit
  const handleSaveOrder = async (payload: CreateJobOrderPayload, orderId?: string) => {
    if (isDemoMode) {
      const nowIso = new Date().toISOString();
      if (orderId) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  ...payload.job_order,
                  updated_at: nowIso,
                  customer: o.customer
                    ? { ...o.customer, ...payload.customer }
                    : {
                        id: `cust-${Date.now()}`,
                        name: payload.customer.name,
                        phone: payload.customer.phone,
                        address: payload.customer.address || '',
                        created_at: nowIso,
                      },
                  job_details: { ...o.job_details, ...payload.job_details, id: o.job_details?.id || `det-${Date.now()}`, job_order_id: orderId },
                }
              : o
          )
        );
        showToast('تم تحديث أمر الشغل (وضع المعاينة)', 'success');
      } else {
        const newId = `ord-demo-${Date.now()}`;
        const custId = `cust-demo-${Date.now()}`;
        const demoCust: Customer = {
          id: custId,
          name: payload.customer.name,
          phone: payload.customer.phone,
          address: payload.customer.address || '',
          created_at: nowIso,
        };
        const demoOrder: JobOrderPopulated = {
          id: newId,
          order_number: payload.job_order.order_number,
          customer_id: custId,
          room_model_code: payload.job_order.room_model_code,
          contract_date: payload.job_order.contract_date,
          delivery_date: payload.job_order.delivery_date,
          general_specs: payload.job_order.general_specs,
          status: payload.job_order.status,
          current_stage: payload.job_order.current_stage || 'لم يبدأ',
          total_price: payload.job_order.total_price,
          deposit_paid: payload.job_order.deposit_paid,
          created_at: nowIso,
          updated_at: nowIso,
          customer: demoCust,
          job_details: {
            id: `det-demo-${Date.now()}`,
            job_order_id: newId,
            ...payload.job_details,
          },
          attachments: [],
        };
        setOrders((prev) => [demoOrder, ...prev]);
        setCustomers((prev) => [demoCust, ...prev]);
        showToast('تم حفظ أمر الشغل (وضع المعاينة)', 'success');
      }
      return;
    }

    try {
      if (orderId) {
        const updated = await updateJobOrderInFirestore(orderId, payload);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        if (updated.customer) {
          setCustomers((prev) =>
            prev.map((c) => (c.id === updated.customer?.id ? { ...c, ...updated.customer } : c))
          );
        }
        if (selectedOrderForCard && selectedOrderForCard.id === orderId) {
          setSelectedOrderForCard(updated);
        }
        showToast('تم حفظ تعديلات أمر الشغل بنجاح', 'success');
      } else {
        const newPopulated = await saveJobOrderToFirestore(payload);
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === newPopulated.id);
          if (exists) return prev;
          return [newPopulated, ...prev];
        });

        const newCust = newPopulated.customer;
        if (newCust) {
          setCustomers((prev) => {
            const exists = prev.some((c) => c.id === newCust.id);
            if (exists) return prev;
            return [newCust, ...prev];
          });
        }
        showToast(`تم تسجيل أمر الشغل ${newPopulated.order_number} بنجاح`, 'success');
      }
    } catch (e) {
      console.error('Firebase save or update error:', e);
      showToast('تعذر حفظ أمر الشغل في قاعدة البيانات. تحقق من الصلاحيات أو الاتصال.', 'error');
      throw e;
    }
  };

  // Handle Quick Status Update
  const handleUpdateStatus = async (id: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find((o) => o.id === id);
    const previousStatus = targetOrder?.status;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);

    try {
      if (!isDemoMode) {
        await updateOrderStatusInFirestore(id, newStatus, {
          deliveredAt: targetOrder?.delivered_at || todayDate,
        });
      }

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id !== id) return ord;
          if (newStatus === 'تسليم') {
            return {
              ...ord,
              status: newStatus,
              delivered_at: ord.delivered_at || todayDate,
              current_stage: 'جاهز للتسليم',
              stage_updated_at: nowIso,
              updated_at: nowIso,
            };
          }
          return { ...ord, status: newStatus, updated_at: nowIso };
        })
      );

      if (selectedOrderForCard && selectedOrderForCard.id === id) {
        setSelectedOrderForCard((prev) => {
          if (!prev) return null;
          if (newStatus === 'تسليم') {
            return {
              ...prev,
              status: newStatus,
              delivered_at: prev.delivered_at || todayDate,
              current_stage: 'جاهز للتسليم',
              stage_updated_at: nowIso,
              updated_at: nowIso,
            };
          }
          return { ...prev, status: newStatus, updated_at: nowIso };
        });
      }

      if (newStatus === 'تسليم') {
        showToast(
          `تم تسليم الأمر ${targetOrder?.order_number || ''} — اختفى من الأوامر الجارية وانتقل إلى «التسليمات»`,
          'success'
        );
      } else if (previousStatus === 'تسليم') {
        showToast(
          `تم إرجاع الأمر ${targetOrder?.order_number || ''} إلى «أوامر الشغل الجارية» (${newStatus})`,
          'info'
        );
      } else {
        showToast(`تم تحديث حالة الأمر إلى "${newStatus}"`, 'success');
      }
    } catch (e) {
      console.error('Firebase status update error:', e);
      showToast('فشل تحديث حالة أمر الشغل. تحقق من صلاحيات دورك الوظيفي.', 'error');
    }
  };

  // Handle Production Stage Update
  const handleUpdateOrderStage = async (id: string, newStage: ProductionStage) => {
    const nowIso = new Date().toISOString();
    try {
      if (!isDemoMode) {
        await updateOrderStageInFirestore(id, newStage);
      }

      setOrders((prev) =>
        prev.map((ord) => (ord.id === id ? { ...ord, current_stage: newStage, stage_updated_at: nowIso } : ord))
      );

      if (selectedOrderForCard && selectedOrderForCard.id === id) {
        setSelectedOrderForCard((prev) => (prev ? { ...prev, current_stage: newStage, stage_updated_at: nowIso } : null));
      }
      showToast(`تم نقل المرحلة إلى "${newStage}"`, 'success');
    } catch (e) {
      console.error('Firebase stage update error:', e);
      showToast('تعذر تحديث مرحلة التصنيع في قاعدة البيانات.', 'error');
    }
  };

  // Handle Archive Status Update
  const handleUpdateArchiveStatus = async (id: string, isArchived: boolean) => {
    const targetOrder = orders.find((o) => o.id === id);
    try {
      if (!isDemoMode) {
        await updateOrderArchiveStatusInFirestore(id, isArchived);
      }

      setOrders((prev) =>
        prev.map((ord) => (ord.id === id ? { ...ord, is_archived: isArchived } : ord))
      );

      if (selectedOrderForCard && selectedOrderForCard.id === id) {
        setSelectedOrderForCard((prev) => (prev ? { ...prev, is_archived: isArchived } : null));
      }
      showToast(
        isArchived
          ? `تم نقل الأمر ${targetOrder?.order_number || ''} إلى الأرشيف النهائي`
          : `تمت استعادة الأمر ${targetOrder?.order_number || ''} إلى ${
              targetOrder?.status === 'تسليم' ? 'التسليمات' : 'أوامر الشغل الجارية'
            }`,
        'success'
      );
    } catch (e) {
      console.error('Firebase archive update error:', e);
      showToast('تعذر تعديل حالة الأرشفة.', 'error');
    }
  };

  // Handle Batch Archiving of Settled Deliveries
  const handleBatchArchiveOrders = async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;
    const nowIso = new Date().toISOString();
    const idSet = new Set(orderIds);
    try {
      if (!isDemoMode) {
        await archiveOrdersBatchInFirestore(orderIds);
        if (userProfile) {
          await logAuditEvent({
            user_uid: userProfile.uid,
            user_email: userProfile.email,
            user_role: userProfile.role,
            action: 'BATCH_ORDERS_ARCHIVED',
            entity_type: 'job_order',
            entity_id: orderIds.join(','),
            after: { archived_count: orderIds.length, order_ids: orderIds },
            reason: 'أرشفة دفعة التسليمات المكتملة مالياً والموثقة بإقرار استلام',
          });
        }
      }

      setOrders((prev) =>
        prev.map((ord) => (idSet.has(ord.id) ? { ...ord, is_archived: true, updated_at: nowIso } : ord))
      );
      showToast(`تمت أرشفة ${orderIds.length} أمر تسليم مكتمل بنجاح`, 'success');
    } catch (e) {
      console.error('Batch archive error:', e);
      showToast('تعذر أرشفة التسليمات المحددة.', 'error');
    }
  };

  // Handle Order Deletion
  const handleDeleteOrder = async (id: string) => {
    try {
      if (!isDemoMode) {
        await deleteOrderFromFirestore(id);
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
      showToast('تم حذف أمر الشغل', 'success');
    } catch (e) {
      console.error('Firebase delete error:', e);
      showToast('غير مصرح بالحذف أو تعذر الاتصال بقاعدة البيانات.', 'error');
    }
  };

  // Handle Customer Deletion
  const handleDeleteCustomer = async (id: string) => {
    try {
      if (!isDemoMode) {
        await deleteCustomerFromFirestore(id);
      }
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      showToast('تم حذف سجل العميل', 'success');
    } catch (e) {
      console.error('Firebase customer delete error:', e);
      showToast('تعذر حذف سجل العميل. قد يتطلب صلاحية مدير النظام.', 'error');
    }
  };

  // Handle Batch Customer Import
  const handleAddBatchCustomers = async (
    newCustomersList: Array<{ name: string; phone: string; address?: string }>
  ): Promise<number> => {
    try {
      if (isDemoMode) {
        const nowIso = new Date().toISOString();
        const created = newCustomersList.map((c, idx) => ({
          id: `cust-demo-${Date.now()}-${idx}`,
          name: c.name,
          phone: c.phone || '01000000000',
          address: c.address || '',
          created_at: nowIso,
        }));
        setCustomers((prev) => [...created, ...prev]);
        return created.length;
      }

      const added = await saveBatchCustomersToFirestore(newCustomersList);
      if (added.length > 0) {
        setCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const filteredNew = added.filter((c) => !existingIds.has(c.id));
          return [...filteredNew, ...prev];
        });
      }
      return added.length;
    } catch (e) {
      console.error('Firebase batch import error:', e);
      showToast('تعذر استيراد العملاء إلى قاعدة البيانات.', 'error');
      return 0;
    }
  };

  // Handle Single Customer Quick Add
  const handleAddSingleCustomer = async (custData: { name: string; phone: string; address?: string }) => {
    try {
      if (isDemoMode) {
        const saved: Customer = {
          id: `cust-demo-${Date.now()}`,
          name: custData.name,
          phone: custData.phone,
          address: custData.address || '',
          created_at: new Date().toISOString(),
        };
        setCustomers((prev) => [saved, ...prev]);
        showToast('تمت إضافة العميل بنجاح', 'success');
        return;
      }
      const saved = await saveCustomerToFirestore(custData);
      setCustomers((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);
      showToast('تمت إضافة العميل بنجاح', 'success');
    } catch (e) {
      console.error('Firebase single customer save error:', e);
      showToast('تعذر إضافة العميل. تحقق من الصلاحيات.', 'error');
    }
  };

  // Handle Batch Job Orders Import
  const handleAddBatchOrders = async (ordersList: CreateJobOrderPayload[]): Promise<number> => {
    try {
      const savedOrders = await saveBatchJobOrdersToFirestore(ordersList);
      if (savedOrders.length > 0) {
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const filteredNew = savedOrders.filter((o) => !existingIds.has(o.id));
          return [...filteredNew, ...prev];
        });

        setCustomers((prev) => {
          const customerMap = new Map(prev.map((c) => [c.id, c]));
          for (const ord of savedOrders) {
            if (ord.customer && !customerMap.has(ord.customer.id)) {
              customerMap.set(ord.customer.id, ord.customer);
            }
          }
          return Array.from(customerMap.values());
        });
      }
      return savedOrders.length;
    } catch (e) {
      console.error('Firebase batch job orders error:', e);
      showToast('تعذر استيراد دفعة أوامر الشغل.', 'error');
      return 0;
    }
  };

  // Navigate directly to Customer Delivery Receipt linked to a specific order or customer
  const handleOpenDeliveryReceiptForOrder = (ord: JobOrderPopulated) => {
    setSelectedCustomerForReceiptId(ord.customer_id);
    setSelectedOrderForReceiptId(ord.id);
    setActiveTab('receipt');
  };

  // Issue & Persist Official Delivery Receipt linked to selected Job Orders
  const handleIssueDeliveryReceipt = async (params: {
    customer: Customer;
    selectedOrders: JobOrderPopulated[];
    receiptDate: string;
    notes?: string;
    deliveryBranch?: string;
    markAsDelivered: boolean;
  }) => {
    const receiptNumber = generateNextDeliveryReceiptNumber(deliveryReceipts);
    const nowIso = new Date().toISOString();

    const receiptRecord = buildDeliveryReceiptRecord({
      receiptNumber,
      customer: params.customer,
      selectedOrders: params.selectedOrders,
      receiptDate: params.receiptDate,
      notes: params.notes,
      deliveryBranch: params.deliveryBranch,
      userProfile,
      markOrdersDelivered: params.markAsDelivered,
      nowIso,
    });

    const { orderUpdates, transitionedOrderIds } = planOrderReceiptLinksAndDeliveryTransitions({
      selectedOrders: params.selectedOrders,
      receiptRecord,
      markAsDelivered: params.markAsDelivered,
      userProfile,
      nowIso,
    });

    if (!isDemoMode) {
      await issueDeliveryReceiptToFirestore({
        receiptRecord,
        orderUpdates,
      });

      if (userProfile) {
        await logAuditEvent({
          user_uid: userProfile.uid,
          user_email: userProfile.email,
          user_role: userProfile.role,
          action: 'DELIVERY_RECEIPT_ISSUED',
          entity_type: 'delivery_receipt',
          entity_id: receiptRecord.id,
          after: {
            receipt_number: receiptRecord.receipt_number,
            customer_id: receiptRecord.customer_id,
            order_numbers: receiptRecord.order_numbers,
            transitioned_to_delivered: transitionedOrderIds,
          },
          reason: `إصدار إقرار استلام العميل وربطه بـ ${orderUpdates.length} أمر شغل`,
        });
      }
    }

    const updateMap = new Map(orderUpdates.map((u) => [u.orderId, u.updates]));
    setOrders((prev) =>
      prev.map((ord) => {
        const patch = updateMap.get(ord.id);
        return patch ? { ...ord, ...patch } : ord;
      })
    );

    if (selectedOrderForCard && updateMap.has(selectedOrderForCard.id)) {
      const patch = updateMap.get(selectedOrderForCard.id)!;
      setSelectedOrderForCard((prev) => (prev ? { ...prev, ...patch } : null));
    }

    setDeliveryReceipts((prev) => [
      receiptRecord,
      ...prev.filter((r) => r.id !== receiptRecord.id),
    ]);

    return { receiptRecord, transitionedOrderIds };
  };

  const handleDeleteDeliveryReceipt = async (receipt: DeliveryReceiptRecord) => {
    if (!isDemoMode) {
      await deleteDeliveryReceiptFromFirestore(receipt.id, receipt.order_ids);
    }

    const unlinkedIds = new Set(receipt.order_ids);
    setOrders((prev) =>
      prev.map((ord) =>
        unlinkedIds.has(ord.id) && ord.delivery_receipt_id === receipt.id
          ? {
              ...ord,
              delivery_receipt_id: '',
              delivery_receipt_number: '',
              delivered_at: '',
            }
          : ord
      )
    );
    setDeliveryReceipts((prev) => prev.filter((r) => r.id !== receipt.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-[#233B5D] flex items-center justify-center text-white shadow-xl">
          <Hammer className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white mt-4">
          النجار فيرنتشر
        </h2>
        <p className="text-xs text-slate-500 font-bold mt-1">
          جاري التحقق من الهوية والصلاحيات المركزية...
        </p>
      </div>
    );
  }

  if ((!currentUser && !isDemoMode) || isDeactivated) {
    return <LoginPage />;
  }

  const isCurrentTabAllowed = canAccessTab(userProfile, activeTab);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-row transition-colors duration-200">
      
      {/* 1. Desktop Right-Side Collapsible Sidebar (First child in RTL flex-row renders on the RIGHT) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={handleToggleSidebar}
        urgentOrdersCount={urgentOrdersCount}
        deliveredOrdersCount={deliveredOrdersCount}
        totalOrdersCount={orders.length}
      />

      {/* 2. Main Workspace Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Compact Top Bar */}
        <TopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
          onOpenNewOrderModal={() => {
            setOrderToEdit(null);
            setIsNewOrderModalOpen(true);
          }}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          orders={orders}
          onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!isCurrentTabAllowed ? (
          <AccessDenied
            requiredPermission={TAB_PERMISSION_MAP[activeTab]?.join(', ')}
            onGoHome={() => {
              const firstPermitted = ALL_NAV_ITEMS.find((item) => canAccessTab(userProfile, item.id));
              if (firstPermitted) setActiveTab(firstPermitted.id);
            }}
          />
        ) : (
        <>
        {/* TAB -1: MASTER EXECUTIVE DASHBOARD */}
        {activeTab === 'executive-dashboard' && (
          <ExecutiveDashboard
            orders={orders}
            customers={customers}
            truckManifests={truckManifests}
            onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
            onEditOrder={(ord) => {
              setOrderToEdit(ord);
              setIsNewOrderModalOpen(true);
            }}
            onOpenNewOrderModal={() => {
              setOrderToEdit(null);
              setIsNewOrderModalOpen(true);
            }}
            onOpenSmartSearch={handleOpenSmartSearch}
            onNavigateTab={(tab, contextId, orderId) => {
              if (tab === 'receipt') {
                setSelectedCustomerForReceiptId(contextId || '');
                setSelectedOrderForReceiptId(orderId || '');
              }
              setActiveTab(tab);
            }}
          />
        )}

        {/* TAB 0-A: SMART SEARCH, MONTH CENTER & WORKSHOP ROOM INVENTORY */}
        {activeTab === 'smart-search' && (
          <SmartSearchStudio
            orders={orders}
            customers={customers}
            receipts={deliveryReceipts}
            truckManifests={truckManifests}
            initialSeed={smartSearchSeed}
            onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
            onOpenDeliveryReceipt={handleOpenDeliveryReceiptForOrder}
            onEditOrder={(ord) => {
              setOrderToEdit(ord);
              setIsNewOrderModalOpen(true);
            }}
          />
        )}

        {/* TAB 0: TEMPLATE STUDIO */}
        {activeTab === 'template-studio' && (
          <TemplateStudio onSaveToDatabase={(payload) => handleSaveOrder(payload)} />
        )}

        {/* TAB 1: JOB ORDERS MANAGEMENT (ACTIVE FACTORY QUEUE) */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <DashboardStats
              orders={orders}
              activeFilter={activeFilter}
              onFilterByStatus={(st) => setActiveFilter(st)}
              onOpenDeliveriesTab={() => setActiveTab('deliveries')}
            />

            <OrderList
              orders={orders}
              customers={customers}
              onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
              onEditOrder={(ord) => {
                setOrderToEdit(ord);
                setIsNewOrderModalOpen(true);
              }}
              onOpenDeliveryReceipt={handleOpenDeliveryReceiptForOrder}
              onUpdateStatus={handleUpdateStatus}
              onUpdateStage={handleUpdateOrderStage}
              onUpdateArchiveStatus={handleUpdateArchiveStatus}
              onDeleteOrder={handleDeleteOrder}
              onAddBatchOrders={handleAddBatchOrders}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              onNavigateToDashboard={() => setActiveTab('executive-dashboard')}
              onOpenDeliveries={() => setActiveTab('deliveries')}
              onOpenArchive={() => setActiveTab('archive')}
            />
          </div>
        )}

        {/* TAB 1B: DELIVERIES & POST-DELIVERY CLOSURE */}
        {activeTab === 'deliveries' && (
          <DeliveriesView
            orders={orders}
            onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
            onOpenDeliveryReceipt={handleOpenDeliveryReceiptForOrder}
            onUpdateArchiveStatus={handleUpdateArchiveStatus}
            onBatchArchiveOrders={handleBatchArchiveOrders}
            onUpdateStatus={handleUpdateStatus}
            onNavigateToArchive={() => setActiveTab('archive')}
          />
        )}

        {/* TAB 1C: HISTORICAL ARCHIVE */}
        {activeTab === 'archive' && (
          <ArchiveView
            orders={orders}
            onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
            onRestoreOrder={handleUpdateArchiveStatus}
            onDeleteOrder={handleDeleteOrder}
            onNavigateToDeliveries={() => setActiveTab('deliveries')}
          />
        )}

        {/* TAB 2: CUSTOMERS */}
        {activeTab === 'customers' && (
          <CustomersManager
            customers={customers}
            orders={orders}
            onOpenNewOrderForCustomer={() => {
              setOrderToEdit(null);
              setIsNewOrderModalOpen(true);
            }}
            onOpenDeliveryReceiptForCustomer={(cust) => {
              setSelectedCustomerForReceiptId(cust.id);
              setSelectedOrderForReceiptId('');
              setActiveTab('receipt');
            }}
            onDeleteCustomer={handleDeleteCustomer}
            onAddBatchCustomers={handleAddBatchCustomers}
            onAddSingleCustomer={handleAddSingleCustomer}
          />
        )}

        {/* TAB 3: CUSTOMER DELIVERY RECEIPT REPORT */}
        {activeTab === 'receipt' && (
          <CustomerDeliveryReceiptView
            customers={customers}
            orders={orders}
            receipts={deliveryReceipts}
            initialCustomerId={selectedCustomerForReceiptId}
            initialOrderId={selectedOrderForReceiptId}
            onIssueReceipt={handleIssueDeliveryReceipt}
            onDeleteReceipt={handleDeleteDeliveryReceipt}
            onSelectOrderForCard={(ord) => setSelectedOrderForCard(ord)}
          />
        )}

        {/* TAB 4: TRUCK MANIFEST STUDIO (حمولة العربية) */}
        {activeTab === 'truck-manifest' && (
          <TruckManifestStudio
            customers={customers}
            orders={orders}
            manifests={truckManifests}
            onSaveManifestToDb={async (manifest) => {
              const saved = await saveTruckManifestToFirestore(manifest);
              if (saved && saved.id) {
                setTruckManifests((prev) => [saved, ...(prev || []).filter((m) => m && m.id && m.id !== saved.id)]);
              }
            }}
            onDeleteManifestFromDb={async (manifestId) => {
              await deleteTruckManifestFromFirestore(manifestId);
              setTruckManifests((prev) => (prev || []).filter((m) => m.id !== manifestId));
            }}
          />
        )}

        {/* TAB 5: TOP SELLING MODELS REPORT */}
        {activeTab === 'top-models' && (
          <TopSellingModelsReport orders={orders} />
        )}

        {/* TAB 6: CRITICAL & OVERDUE REPORT */}
        {activeTab === 'critical-report' && (
          <CriticalOverdueReport orders={orders} />
        )}

        {/* TAB 7: BOTTLENECK & PRODUCTION STAGES REPORT */}
        {activeTab === 'bottleneck-report' && (
          <BottleneckReport orders={orders} onUpdateOrderStage={handleUpdateOrderStage} />
        )}

        {/* TAB 8: MONTHLY DELIVERY REPORT */}
        {activeTab === 'delivery-report' && (
          <MonthlyDeliveredReport orders={orders} />
        )}

        {/* TAB 9: USER MANAGEMENT & RBAC GOVERNANCE */}
        {activeTab === 'user-management' && (
          <UserManagementView />
        )}

        {/* TAB 9-B: SETTINGS HUB */}
        {activeTab === 'settings' && (
          <SettingsView
            userProfile={userProfile}
            onExportBackup={() => {
              const data = {
                orders,
                customers,
                deliveryReceipts,
                truckManifests,
                exportDate: new Date().toISOString(),
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json;charset=utf-8',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `elnaggar-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          />
        )}

        {/* TAB 10: AI WORKSHOP QUALITY ASSISTANT */}
        {activeTab === 'ai-assistant' && (
          <AiAssistant orders={orders} />
        )}
        </>
        )}

      </main>

        {/* Footer */}
        <footer className="no-print bg-white/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 py-6 mt-12 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 font-serif font-bold text-[#233B5D] dark:text-[#8CB4D9]">
              <span>مصنع النجار فيرنتشر للأثاث والديكور</span>
              <span>·</span>
              <span>ديفلوبر معاذ رمضان</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span>© {new Date().getFullYear()} El-Naggar Furniture</span>
            </div>
          </div>
        </footer>

      </div>

      {/* 3. Responsive Mobile Slide-over Navigation Drawer */}
      <MobileNavigationDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        urgentOrdersCount={urgentOrdersCount}
        deliveredOrdersCount={deliveredOrdersCount}
      />

      {/* MODALS */}
      {selectedOrderForCard && (
        <WorkshopCardModal
          order={selectedOrderForCard}
          onClose={() => setSelectedOrderForCard(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateStage={handleUpdateOrderStage}
          onUpdateArchiveStatus={handleUpdateArchiveStatus}
          onOpenDeliveryReceipt={(ord) => {
            setSelectedOrderForCard(null);
            handleOpenDeliveryReceiptForOrder(ord);
          }}
          onEditOrder={(ord) => {
            setOrderToEdit(ord);
            setIsNewOrderModalOpen(true);
          }}
        />
      )}

      {isNewOrderModalOpen && (
        <OrderFormModal
          isOpen={isNewOrderModalOpen}
          onClose={() => {
            setIsNewOrderModalOpen(false);
            setOrderToEdit(null);
          }}
          onSubmit={handleSaveOrder}
          orderToEdit={orderToEdit}
        />
      )}

      {/* Offline Indicator Banner */}
      <OfflineIndicator />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <MainApp />
      </FeedbackProvider>
    </AuthProvider>
  );
}
