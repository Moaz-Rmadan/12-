import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { OrderList } from './components/OrderList';
import { WorkshopCardModal } from './components/WorkshopCardModal';
import { OrderFormModal } from './components/OrderFormModal';
import { CustomersManager } from './components/CustomersManager';
import { TemplateStudio } from './components/TemplateStudio';

import {
  subscribeToJobOrders,
  subscribeToCustomers,
  saveJobOrderToFirestore,
  updateOrderStatusInFirestore,
  deleteOrderFromFirestore,
} from './lib/firebase';

import {
  JobOrderPopulated,
  Customer,
  OrderStatus,
  CreateJobOrderPayload,
} from './types';
import {
  initialCustomers,
  getPopulatedOrders,
} from './data/mockData';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeTab, setActiveTab] = useState<string>('template-studio');
  const [activeFilter, setActiveFilter] = useState<string>('الكل');

  const [orders, setOrders] = useState<JobOrderPopulated[]>(() => getPopulatedOrders());
  const [customers, setCustomers] = useState<Customer[]>(() => initialCustomers);

  const [selectedOrderForCard, setSelectedOrderForCard] = useState<JobOrderPopulated | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);

  // Sync Dark mode with <html> tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Firebase Real-time Firestore Sync Listeners
  useEffect(() => {
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

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
    };
  }, []);

  // Handle New Order Submission (Firebase Firestore + Local Fallback)
  const handleCreateOrder = async (payload: CreateJobOrderPayload) => {
    try {
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
    } catch (e) {
      console.error('Firebase save error, falling back locally', e);
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

  // Handle Order Deletion (Firebase Firestore)
  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteOrderFromFirestore(id);
    } catch (e) {
      console.error('Firebase delete error', e);
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewOrderModal={() => setIsNewOrderModalOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 0: TEMPLATE STUDIO */}
        {activeTab === 'template-studio' && (
          <TemplateStudio onSaveToDatabase={handleCreateOrder} />
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
              onSelectOrder={(ord) => setSelectedOrderForCard(ord)}
              onUpdateStatus={handleUpdateStatus}
              onDeleteOrder={handleDeleteOrder}
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
            onOpenNewOrderForCustomer={() => setIsNewOrderModalOpen(true)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="no-print bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-serif font-bold text-amber-950 dark:text-amber-200">
            <span>مصنع النجار ديزاين للأثاث والديكور</span>
            <span>·</span>
            <span>نظام إدارة أوامر الشغل المربوط بـ Firebase Firestore</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Firebase Firestore Database</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} El-Naggar Design</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <WorkshopCardModal
        order={selectedOrderForCard}
        onClose={() => setSelectedOrderForCard(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      <OrderFormModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onSubmit={handleCreateOrder}
      />

    </div>
  );
}
