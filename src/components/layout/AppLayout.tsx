import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { RiskSidebar } from "@/components/RiskSidebar";
import { TopBar } from "@/components/TopBar";
import { RiskProvider } from "@/hooks/useRiskData";
import { BiometricDialog } from "@/components/BiometricDialog";
import { AnimatePresence, motion } from "framer-motion";

const AppLayout: React.FC = () => {
  const location = useLocation();
  return (
    <RiskProvider>
      <div className="min-h-screen w-full grid md:grid-cols-[minmax(260px,320px)_1fr]">
        <div className="hidden md:block p-3 md:p-4">
          <RiskSidebar />
        </div>
        <div className="flex flex-col">
          <TopBar />
          <main className="container mx-auto p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-10">
        {/* On small screens, show a compact floating risk card */}
        <div className="glass-card rounded-xl p-3 bg-ambient animate-gradient-move">
          <div className="text-sm font-medium">Fraud Risk active in sidebar (desktop)</div>
          <div className="text-xs text-muted-foreground">Use a larger screen to view the full panel.</div>
        </div>
      </div>
      <BiometricDialog />
    </RiskProvider>
  );
};

export default AppLayout;
