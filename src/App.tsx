import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Header } from './components/Header.js';
import { HeroSection } from './components/HeroSection.js';
import { CategoryDepartmentGrid } from './components/CategoryDepartmentGrid.js';
import { ProductCatalog } from './components/ProductCatalog.js';
import { RepairLabSection } from './components/RepairLabSection.js';
import { ContactSection } from './components/ContactSection.js';
import { Footer } from './components/Footer.js';
import { AdminPanel } from './components/admin/AdminPanel.js';
import { SpecsModal } from './components/SpecsModal.js';
import { CartDrawer } from './components/CartDrawer.js';
import { RepairBookingModal } from './components/RepairBookingModal.js';
import { RepairTrackerModal } from './components/RepairTrackerModal.js';
import { AuthModal } from './components/AuthModal.js';
import { UserProfileModal } from './components/UserProfileModal.js';
import { CctvSurveyModal } from './components/CctvSurveyModal.js';
import { CustomPcBuilderModal } from './components/CustomPcBuilderModal.js';
import { NotificationsDrawer } from './components/NotificationsDrawer.js';
import { ToastNotification } from './components/ToastNotification.js';

const MainLayout: React.FC = () => {
  const { currentView, isAdmin } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-[#e0e0e0] selection:bg-cyan-500 selection:text-white flex flex-col font-sans transition-colors duration-200">
      {/* Global Navigation Header */}
      <Header />

      {/* Main View Router */}
      <main className="flex-1 pt-16 sm:pt-18 md:pt-22 lg:pt-24">
        {currentView === 'admin' && isAdmin ? (
          <AdminPanel />
        ) : (
          <div className="space-y-6 sm:space-y-10 md:space-y-14 lg:space-y-16">
            <HeroSection />
            <CategoryDepartmentGrid />
            <ProductCatalog />
            <RepairLabSection />
            <ContactSection />
          </div>
        )}
      </main>

      {/* Global Footer - Shown on storefront */}
      {currentView === 'store' && <Footer />}

      {/* Floating Drawers & Modals */}
      <SpecsModal />
      <CartDrawer />
      <RepairBookingModal />
      <RepairTrackerModal />
      <CctvSurveyModal />
      <CustomPcBuilderModal />
      <AuthModal />
      <UserProfileModal />
      <NotificationsDrawer />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
