import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import Statements from "./pages/Statements";
import Settings from "./pages/Settings";
import PayBill from "./pages/PayBill";
import Transfers from "./pages/Transfers";
import Cards from "./pages/Cards";
import ProfileSecurity from "./pages/ProfileSecurity";
import { SecuritySettingsProvider } from "@/hooks/useSecuritySettings";
import { SearchProvider } from "@/hooks/useSearch";
import TypingDNAForm from "./pages/Typingdna";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Provide global security settings and search state */}
      <SecuritySettingsProvider>
        <SearchProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/app" element={<AppLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="payments" element={<Payments />} />
                <Route path="pay-bill" element={<PayBill />} />
                <Route path="transfers" element={<Transfers />} />
                <Route path="statements" element={<Statements />} />
                <Route path="cards" element={<Cards />} />
                <Route path="profile-security" element={<ProfileSecurity />} />
                <Route path="dnaform" element={<TypingDNAForm />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SearchProvider>
      </SecuritySettingsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
