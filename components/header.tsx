"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { site } from "@/lib/site"

const navItems = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "People", href: "#portfolio" },
  { label: "Team", href: "#team" }
]

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 backdrop-blur-md rounded-2xl py-3 animate-scale-fade-in bg-[rgba(246,247,251,0.7)] border border-[rgba(15,17,23,0.08)] shadow-[0_18px_50px_-30px_rgba(15,17,23,0.5)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="lg:hidden p-2 text-foreground/80 hover:text-foreground boty-transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm tracking-wide text-foreground/70 hover:text-foreground boty-transition"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <span className="font-serif text-2xl tracking-wide text-foreground">
              {site.name}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="#contact"
              className="hidden sm:inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] text-background boty-transition hover:bg-foreground/90"
            >
              Apply / Business
            </Link>
          </div>
        </div>

        <div
          className={`lg:hidden overflow-hidden boty-transition ${
            isMenuOpen ? "max-h-64 pb-4" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-4 pt-4 border-t border-border/60">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm tracking-wide text-foreground/70 hover:text-foreground boty-transition"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] text-background boty-transition hover:bg-foreground/90 w-fit"
              onClick={() => setIsMenuOpen(false)}
            >
              Apply / Business
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
