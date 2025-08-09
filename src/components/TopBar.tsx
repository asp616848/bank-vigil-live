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
import { Input } from "@/components/ui/input";
import { Banknote, ChevronDown, LogOut, Moon, Sun, User, Bell, Search as SearchIcon, Menu } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSearch } from "@/hooks/useSearch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export const TopBar: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("theme") || "light");
  const { query, setQuery } = useSearch();
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

  const items = [
    { to: "/app/dashboard", label: "Home" },
    { to: "/app/payments", label: "Payments" },
    { to: "/app/statements", label: "Statements" },
    { to: "/app/transfers", label: "Transfers" },
    { to: "/app/cards", label: "My Cards" },
    { to: "/app/profile-security", label: "Profile & Security" },
  ];

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center gap-3 h-14 px-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => navigate("/app/dashboard")}
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-md pr-2"
            aria-label="Bank of India — Home"
          >
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground shadow" aria-hidden>
              <Banknote className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-display text-base font-bold tracking-tight">Bank of India</span>
            </div>
          </button>

          {/* Nav links */}
          <nav className="ml-1 hidden md:flex items-center gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Search input */}
          <div className="ml-auto flex-1 max-w-md hidden sm:flex items-center gap-2">
            <div className="relative w-full">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search transactions or statements..."
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* On mobile, quick search icon opens focus to search field via hash */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              className="sm:hidden"
              onClick={() => {
                const el = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
                el?.focus();
              }}
            >
              <SearchIcon className="h-5 w-5" />
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
                <DropdownMenuItem onClick={() => navigate("/app/profile-security")}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                  <User className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/")}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile full-screen nav via floating button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="md:hidden fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg" aria-label="Open navigation">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="inset-0 h-screen w-screen rounded-none p-6">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 grid gap-2">
            {items.map((item) => (
              <SheetClose asChild key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-lg text-base ${isActive ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`
                  }
                >
                  {item.label}
                </NavLink>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
};
