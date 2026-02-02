"use client"

import { useState } from "react"
import Link from "next/link"
import { Instagram, Youtube, Linkedin } from "lucide-react"
import { site } from "@/lib/site"

const footerLinks = [
  { name: "About", href: "#about" },
  { name: "Services", href: "#services" },
  { name: "People", href: "#portfolio" },
  { name: "Team", href: "#team" },
  { name: "Apply / Business", href: "#contact" }
]

export function Footer() {
  const [contactOpen, setContactOpen] = useState(false)

  return (
    <footer className="relative overflow-hidden bg-background pb-12 pt-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(232,236,245,0.7),_rgba(246,247,251,0)_65%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-[2.6fr_0.4fr_0.4fr_0.35fr_0.55fr]">
          <div>
            <h2 className="font-serif text-3xl text-foreground">
              {site.name}
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              {site.description}
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white text-foreground/60 boty-transition hover:text-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white text-foreground/60 boty-transition hover:text-foreground"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white text-foreground/60 boty-transition hover:text-foreground"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="md:col-start-4 md:justify-self-end md:text-right">
            <h3 className="text-xs uppercase tracking-[0.35em] text-foreground/60">
              Navigation
            </h3>
            <ul className="mt-3 space-y-2">
              {footerLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground boty-transition"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 md:col-start-5 md:justify-self-end md:text-right">
            <h3 className="text-xs uppercase tracking-[0.35em] text-foreground/60">
              Contact
            </h3>
            <div className="text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setContactOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted-foreground hover:text-foreground boty-transition"
                aria-expanded={contactOpen}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center text-base transition-transform ${
                    contactOpen ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
                문의처
              </button>
              {contactOpen && (
                <p className="mt-3 text-foreground">{site.contactEmail}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <span>
            {new Date().getFullYear()} {site.name}. All rights reserved.
          </span>
          <Link
            href="/admin"
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground boty-transition"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
