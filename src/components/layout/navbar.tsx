"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  QrCode,
  LayoutDashboard,
  ShoppingBag,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = session
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
        { href: "/repairs", label: "Repairs", icon: Wrench },
        { href: "/profile", label: "Profile", icon: User },
      ]
    : [
        { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
        { href: "#how-it-works", label: "How It Works", icon: null },
      ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-[#080808]/90 backdrop-blur-xl border-b border-[#1f1f1f]"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center transition-all group-hover:border-emerald-500/40 group-hover:bg-emerald-500/15">
              <QrCode className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              Eco<span className="text-emerald-400">X</span>change
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-100 hover:bg-white/4 transition-all"
              >
                {link.icon && <link.icon className="w-3.5 h-3.5" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <>
                {(session.user as { isAdmin?: boolean }).isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] text-violet-400 hover:bg-violet-400/8 transition-all"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-100 hover:bg-white/4 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[13px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all"
                >
                  Dashboard
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-3 py-1.5 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-100 hover:bg-white/4 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[13px] font-medium bg-white text-black hover:bg-zinc-100 transition-all"
                >
                  Get Started
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0f0f0f] border-b border-[#1f1f1f] px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] text-zinc-400 hover:text-zinc-100 hover:bg-white/4 transition-all"
            >
              {link.icon && <link.icon className="w-4 h-4" />}
              {link.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {session ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] text-red-400 hover:bg-red-400/8 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className="btn-secondary text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary text-center justify-center"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
