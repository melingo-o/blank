"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { site } from "@/lib/site"

export function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-screen overflow-hidden bg-background"
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute inset-0 hero-noise" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(246,247,251,0.5),_rgba(246,247,251,0.1)_45%,_rgba(15,17,23,0.78)_100%)]" />
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/influencer-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-background" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center pt-32 pb-20">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center text-white">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 animate-blur-in opacity-0"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
            >
              Influencer Incubating Unit
            </span>
            <h1 className="mt-6 font-serif text-5xl leading-[1.02] md:text-7xl lg:text-8xl">
              <span
                className="block animate-blur-in opacity-0"
                style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
              >
                {site.name}
              </span>
              <span
                className="mt-4 block text-white/90 animate-blur-in opacity-0"
                style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
              >
                개성의 데이터화,
                <br />
                영향력의 가치화로
              </span>
            </h1>
            <p
              className="mt-6 mx-auto max-w-2xl text-lg text-white/80 animate-blur-in opacity-0"
              style={{ animationDelay: "0.55s", animationFillMode: "forwards" }}
            >
              우리는 당신만의 고유한 무드를 비즈니스로 전환합니다.
            </p>
            <div
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center animate-blur-in opacity-0"
              style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}
            >
              <Link
                href="#contact"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-sm tracking-wide text-primary-foreground boty-transition hover:bg-primary/90"
              >
                Apply / Business
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="#team"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-4 text-sm tracking-wide text-white/90 boty-transition hover:bg-white/10"
              >
                Meet the team
              </Link>
            </div>

            <div className="mt-14" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
      <div className="pointer-events-none absolute -top-20 left-16 h-72 w-72 rounded-full bg-white/20 blur-3xl" />

      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/70">
        <span className="text-xs tracking-[0.3em] uppercase">Scroll</span>
        <span className="h-10 w-px bg-white/40" />
      </div>
    </section>
  )
}
