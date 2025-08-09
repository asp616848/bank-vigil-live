import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { RiskSidebar } from "@/components/RiskSidebar";
import { TopBar } from "@/components/TopBar";
import { RiskProvider } from "@/hooks/useRiskData";
import { BiometricDialog } from "@/components/BiometricDialog";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

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
      {/* Mobile: floating Risk button opening drawer */}
      <div className="md:hidden fixed bottom-3 left-3 z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="h-11 rounded-full shadow-lg" variant="secondary" aria-label="Open risk panel">
              <ShieldAlert className="mr-2 h-4 w-4" /> Risk
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>Fraud Risk</SheetTitle>
            </SheetHeader>
            <div className="p-3">
              <RiskSidebar />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {/* <BiometricDialog /> */}
    </RiskProvider>
  );
};

export default AppLayout;
