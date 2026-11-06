import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
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
  deleteOrderFromFirestore,
  deleteCustomerFromFirestore,
  saveCustomerToFirestore,
  saveBatchCustomersToFirestore,
  saveBatchJobOrdersToFirestore,
  seedWorkshopDataIfMissing,
} from './lib/firebase';

import {
  JobOrderPopulated,
  Customer,
  OrderStatus,
  ProductionStage,
  CreateJobOrderPayload,
  TruckManifest,
} from './types';
import {
  initialCustomers,
  getPopulatedOrders,
} from './data/mockData';
import { initialTruckManifests } from './data/truckManifestData';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeTab, setActiveTab] = useState<string>('template-studio');
  const [activeFilter, setActiveFilter] = useState<string>('الكل');

  const [orders, setOrders] = useState<JobOrderPopulated[]>(() => getPopulatedOrders());
  const [customers, setCustomers] = useState<Customer[]>(() => initialCustomers);
  const [truckManifests, setTruckManifests] = useState<TruckManifest[]>(() => initialTruckManifests);

  const [selectedOrderForCard, setSelectedOrderForCard] = useState<JobOrderPopulated | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [orderToEdit, setOrderToEdit] = useState<JobOrderPopulated | null>(null);
  const [selectedCustomerForReceiptId, setSelectedCustomerForReceiptId] = useState<string>('');

  // Sync Dark mode with <html> tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Firebase Real-time Firestore Sync Listeners & Workshop Seed Check
  useEffect(() => {
    // Ensure all 5 customers and 12 workshop orders are stored in Firestore
    seedWorkshopDataIfMissing(initialCustomers, getPopulatedOrders()).catch((e) =>
      console.warn('Initial workshop seed check:', e)
    );

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

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
      unsubscribeManifests();
    };
  }, []);

  // Handle Order Create or Edit (Firebase Firestore + Local Fallback)
  const handleSaveOrder = async (payload: CreateJobOrderPayload, orderId?: string) => {
    try {
      if (orderId) {
        // Edit existing order in Firestore
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
      } else {
        // Create new order in Firestore
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
      }
    } catch (e) {
      console.error('Firebase save or update error, falling back locally', e);
    }
  };

  // Handle Quick Status Update (Firebase Firestore)
  const handleUpdateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatusInFirestore(id, newStatus);
    } catch (e) {
      console.error('Firebase status update error', e);
    }

    setOrders((prev) =>
      prev.map((ord) => (ord.id === id ? { ...ord, status: newStatus } : ord))
    );

    if (selectedOrderForCard && selectedOrderForCard.id === id) {
      setSelectedOrderForCard((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Handle Production Stage Update (Firebase Firestore)
  const handleUpdateOrderStage = async (id: string, newStage: ProductionStage) => {
    const nowIso = new Date().toISOString();
    try {
      await updateOrderStageInFirestore(id, newStage);
    } catch (e) {
      console.error('Firebase stage update error', e);
    }

    setOrders((prev) =>
      prev.map((ord) => (ord.id === id ? { ...ord, current_stage: newStage, stage_updated_at: nowIso } : ord))
    );

    if (selectedOrderForCard && selectedOrderForCard.id === id) {
      setSelectedOrderForCard((prev) => (prev ? { ...prev, current_stage: newStage, stage_updated_at: nowIso } : null));
    }
  };

  // Handle Archive Status Update (Firebase Firestore)
  const handleUpdateArchiveStatus = async (id: string, isArchived: boolean) => {
    try {
      await updateOrderArchiveStatusInFirestore(id, isArchived);
    } catch (e) {
      console.error('Firebase archive update error', e);
    }

    setOrders((prev) =>
      prev.map((ord) => (ord.id === id ? { ...ord, is_archived: isArchived } : ord))
    );

    if (selectedOrderForCard && selectedOrderForCard.id === id) {
      setSelectedOrderForCard((prev) => (prev ? { ...prev, is_archived: isArchived } : null));
    }
  };

  // Handle Order Deletion (Firebase Firestore)
  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteOrderFromFirestore(id);
    } catch (e) {
      console.error('Firebase delete error', e);
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // Handle Customer Deletion (Firebase Firestore)
  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomerFromFirestore(id);
    } catch (e) {
      console.error('Firebase customer delete error', e);
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Handle Batch Customer Import (Firebase Firestore)
  const handleAddBatchCustomers = async (
    newCustomersList: Array<{ name: string; phone: string; address?: string }>
  ): Promise<number> => {
    try {
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
      console.error('Firebase batch import error', e);
      return 0;
    }
  };

  // Handle Single Customer Quick Add (Firebase Firestore)
  const handleAddSingleCustomer = async (custData: { name: string; phone: string; address?: string }) => {
    try {
      const saved = await saveCustomerToFirestore(custData);
      setCustomers((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);
    } catch (e) {
      console.error('Firebase single customer save error', e);
    }
  };

  // Handle Batch Job Orders Import (auto-filters customers and orders into Firestore)
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
      console.error('Firebase batch job orders error', e);
      return 0;
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewOrderModal={() => {
          setOrderToEdit(null);
          setIsNewOrderModalOpen(true);
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        orders={orders}
        onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 0: TEMPLATE STUDIO */}
        {activeTab === 'template-studio' && (
          <TemplateStudio onSaveToDatabase={(payload) => handleSaveOrder(payload)} />
        )}

        {/* TAB 1: JOB ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <DashboardStats
              orders={orders}
              activeFilter={activeFilter}
              onFilterByStatus={(st) => setActiveFilter(st)}
            />

            <OrderList
              orders={orders}
              customers={customers}
              onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
              onEditOrder={(ord) => {
                setOrderToEdit(ord);
                setIsNewOrderModalOpen(true);
              }}
              onUpdateStatus={handleUpdateStatus}
              onUpdateStage={handleUpdateOrderStage}
              onUpdateArchiveStatus={handleUpdateArchiveStatus}
              onDeleteOrder={handleDeleteOrder}
              onAddBatchOrders={handleAddBatchOrders}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
            />
          </div>
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
            initialCustomerId={selectedCustomerForReceiptId}
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

      </main>

      {/* Footer */}
      <footer className="no-print bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-serif font-bold text-amber-950 dark:text-amber-200">
            <span>مصنع النجار فيرنتشر للأثاث والديكور</span>
            <span>·</span>
            <span>ديفلوبر معاذ رمضان</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>© {new Date().getFullYear()} El-Naggar Furniture</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {selectedOrderForCard && (
        <WorkshopCardModal
          order={selectedOrderForCard}
          onClose={() => setSelectedOrderForCard(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateStage={handleUpdateOrderStage}
          onUpdateArchiveStatus={handleUpdateArchiveStatus}
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

    </div>
  );
}
