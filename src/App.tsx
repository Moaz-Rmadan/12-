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
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { AccessDenied } from './components/auth/AccessDenied';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { UserManagementView } from './components/admin/UserManagementView';
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

function MainApp() {
  const { currentUser, userProfile, loading, isDeactivated, isDemoMode } = useAuth();
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

  const [selectedOrderForCard, setSelectedOrderForCard] = useState<JobOrderPopulated | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [orderToEdit, setOrderToEdit] = useState<JobOrderPopulated | null>(null);
  const [selectedCustomerForReceiptId, setSelectedCustomerForReceiptId] = useState<string>('');

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
    if (isDemoMode) return;
    
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
  }, [isDemoMode]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-[#233B5D] flex items-center justify-center text-white shadow-xl animate-pulse">
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
        
        {/* TAB -1: MASTER EXECUTIVE DASHBOARD & GLOBAL OMNI-SEARCH */}
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
            onNavigateTab={(tab, contextId) => {
              if (tab === 'receipt' && contextId) {
                setSelectedCustomerForReceiptId(contextId);
              }
              setActiveTab(tab);
            }}
          />
        )}

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
              onNavigateToDashboard={() => setActiveTab('executive-dashboard')}
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

        {/* TAB 9: USER MANAGEMENT & RBAC GOVERNANCE */}
        {activeTab === 'user-management' && (
          <UserManagementView />
        )}

      </main>

        {/* Footer */}
        <footer className="no-print bg-white/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 py-6 mt-12 transition-colors">
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

      </div>

      {/* 3. Responsive Mobile Slide-over Navigation Drawer */}
      <MobileNavigationDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        urgentOrdersCount={urgentOrdersCount}
      />

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
      <MainApp />
    </AuthProvider>
  );
}
