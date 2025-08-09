import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Banknote, ChevronDown, LogOut, Moon, Sun, User, Bell, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const TopBar: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("theme") || "light");
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = React.useMemo(() => {
    const p = location.pathname;
    const map: Record<string, string> = {
      "/app/dashboard": "Home Dashboard",
      "/app/payments": "Payments",
      "/app/statements": "Statements",
      "/app/settings": "Settings",
      "/app/pay-bill": "Pay Bill",
      "/app/transfers": "Transfers",
      "/app/cards": "My Cards",
      "/app/profile-security": "Profile & Security",
    };
    if (map[p]) return map[p];
    const seg = p.split("/").pop() || "";
    return seg ? seg.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : "Bank";
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center justify-between h-14 px-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground shadow" aria-hidden>
            <Banknote className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold tracking-tight">Bank of India</span>
            <span className="hidden sm:inline text-muted-foreground">/</span>
            <span className="text-sm sm:text-base font-medium">{pageTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="hover-scale transition-shadow hover:ring-2 hover:ring-primary/30"
          >
            <Search className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="hover-scale transition-shadow hover:ring-2 hover:ring-primary/30"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Recent Alerts</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Low balance warning resolved</DropdownMenuItem>
              <DropdownMenuItem>Payment received: INR 1,200</DropdownMenuItem>
              <DropdownMenuItem>New login from Chrome (Mumbai)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="transition-transform duration-300 hover:scale-105">
            {theme === "dark" ? (
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform" />
            ) : (
              <Moon className="h-5 w-5 rotate-180 scale-90 transition-transform" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">John Doe</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/")}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
