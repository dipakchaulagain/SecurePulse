import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Network,
  ShieldAlert,
  History,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Active Sessions", href: "/sessions", icon: Network },
    { name: "VPN Users", href: "/vpn-users", icon: Users },
    { name: "Accounting", href: "/accounting", icon: History },
  ];

  const adminNavigation = [
    { name: "Portal Users", href: "/portal-users", icon: ShieldAlert },
    { name: "VPN Servers", href: "/vpn-servers", icon: Network },
    { name: "Audit Logs", href: "/audit", icon: History },
  ];

  const allNav = user?.role === "admin"
    ? [...navigation, ...adminNavigation]
    : navigation;

  const isActive = (path: string) => location === path;

  const roleLabel =
    user?.role === "readonly" ? "Read Only" :
    user?.role === "operator" ? "Operator" :
    user?.role === "admin" ? "Administrator" : user?.role;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:flex-row">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm">
        <div className="flex items-center gap-2 font-bold text-base text-foreground">
          <Shield className="w-5 h-5 text-primary" />
          <span>SecurePulse</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Top Bar */}
      <div className="hidden md:flex fixed top-0 right-0 left-56 h-12 bg-card/95 backdrop-blur-sm border-b border-border/50 z-40 items-center justify-between px-5">
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {format(currentTime, "EEE, MMM d yyyy  ·  HH:mm:ss")}
        </span>
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-xs font-semibold leading-none">{user?.username}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{roleLabel}</p>
          </div>
          <Avatar className="w-7 h-7 border border-border/60">
            <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold">
              {user?.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-56 bg-card border-r border-border/50 shadow-md flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:translate-x-0 md:static",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className="px-4 py-4 border-b border-border/50 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">SecurePulse</h1>
            <p className="text-[10px] text-muted-foreground">Telemetry Manager</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {allNav.map((item) => (
            <Link key={item.name} href={item.href}>
              <motion.div
                whileHover={{ x: 1 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.name}
              </motion.div>
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors outline-none">
                <Avatar className="w-7 h-7 border border-border/60 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold">
                    {user?.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-semibold leading-none truncate">{user?.username}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{roleLabel}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer text-xs" onClick={() => logout()}>
                <LogOut className="mr-2 w-3.5 h-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-49px)] md:h-screen pt-3 md:pt-14 px-4 md:px-5 pb-5 bg-muted/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4 pt-3"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
