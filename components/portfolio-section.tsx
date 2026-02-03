"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createSupabaseBrowser } from "@/lib/supabase/client"

type PortfolioDisplay = {
  id?: string
  name: string
  niche: string
  followers: string
  growth: string
  image_url: string
  is_visible?: boolean
  instagram_handle?: string | null
}

const creators: PortfolioDisplay[] = [
  {
    name: "Jina",
    niche: "Skincare",
    followers: "412K",
    growth: "+180%",
    image_url:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    instagram_handle: "@jina.skin"
  },
  {
    name: "Min",
    niche: "Lifestyle",
    followers: "268K",
    growth: "+140%",
    image_url:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    instagram_handle: "@min.daily"
  },
  {
    name: "Sori",
    niche: "Beauty",
    followers: "521K",
    growth: "+210%",
    image_url:
      "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=600&q=80",
    instagram_handle: "@sori.beauty"
  },
  {
    name: "Noah",
    niche: "Wellness",
    followers: "198K",
    growth: "+120%",
    image_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    instagram_handle: "@noah.well"
  },
  {
    name: "Yuna",
    niche: "Vibe",
    followers: "343K",
    growth: "+165%",
    image_url:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    instagram_handle: "@yuna.vibe"
  },
  {
    name: "June",
    niche: "Daily",
    followers: "154K",
    growth: "+98%",
    image_url:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    instagram_handle: "@june.daily"
  }
]

type PortfolioSectionProps = {
  initialItems?: PortfolioDisplay[]
}

export function PortfolioSection({ initialItems }: PortfolioSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [items, setItems] = useState<PortfolioDisplay[]>(
    initialItems && initialItems.length > 0 ? initialItems : creators
  )
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = useMemo(
    () => (hasSupabase ? createSupabaseBrowser() : null),
    [hasSupabase]
  )

  useEffect(() => {
    if (!supabase) return
    let isMounted = true

    const load = async () => {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("is_visible", true)
        .order("order_index", { ascending: true })

      if (error && error.message.includes("is_visible")) {
        const { data: fallback } = await supabase
          .from("portfolio_items")
          .select("*")
          .order("order_index", { ascending: true })
        if (isMounted && fallback) {
          setItems(fallback)
        }
        return
      }

      if (isMounted && data) {
        setItems(data)
      }
    }

    load()

    const channel = supabase
      .channel("portfolio-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolio_items" },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    if (!sectionRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="portfolio"
      ref={sectionRef}
      className="relative scroll-mt-28 overflow-hidden bg-background py-16"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="max-w-4xl">
            <span className="text-xs uppercase tracking-[0.4em] text-foreground/60">
              PEOPLE
            </span>
            <h2 className="mt-4 font-serif text-4xl text-foreground md:text-5xl">
              함께 성장중인 크리에이터
            </h2>
            <div className="mt-4 flex items-start gap-3">
              <span className="mt-1 h-5 w-0.5 bg-foreground/60" />
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                우리가 증명한 임팩트입니다. 혼자라면 곧 벽에 닿지만, 함께하면
                끝없이 확장되는 성장을 누릴 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((creator, index) => {
            const comingSoon =
              index === 0
                ? { month: "2026. 02" }
                : index === 1
                  ? { month: "2026. 04" }
                  : index === 2
                    ? { month: "2026. 08" }
                    : null
            const comingSoonImage =
              index === 1
                ? "/coming-soon-2026-04.png"
                : index === 2
                  ? "/coming-soon-2026-08.png"
                  : null
            const displayName = comingSoon?.month ?? creator.name
            const displayNiche = comingSoon ? "COMING SOON" : creator.niche
            const showInstagram =
              !comingSoon && Boolean(creator.instagram_handle)
            const displayImage = comingSoonImage ?? creator.image_url

            return (
              <article
                key={creator.id ?? creator.name}
                className={`group relative overflow-hidden rounded-3xl border border-border/60 bg-card boty-shadow transition-all duration-700 ease-out ${
                  isVisible
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-6 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
              <div className="relative h-72 w-full overflow-hidden">
                {displayImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayImage}
                    alt={
                      comingSoon
                        ? `${displayName} coming soon`
                        : `${displayName} profile`
                    }
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-700/60" />
                )}
                {comingSoon ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-white">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                        {comingSoon.month}
                      </p>
                      <p className="text-sm font-semibold uppercase tracking-[0.3em]">
                        Coming Soon!
                      </p>
                      <p className="text-sm leading-relaxed text-white/90">
                        우리는 지금, 새롭게 빛날 당신을
                        <br />
                        찾고있습니다.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                        {creator.niche}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-semibold">
                          {creator.followers}
                        </span>
                        <span className="text-sm text-white/80">
                          {creator.growth}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {displayName}
                  </p>
                  {showInstagram && creator.instagram_handle ? (
                    <p className="text-[10px] text-muted-foreground">
                      {creator.instagram_handle.startsWith("@")
                        ? creator.instagram_handle
                        : `@${creator.instagram_handle}`}
                    </p>
                  ) : null}
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {displayNiche}
                  </p>
                </div>
                {!comingSoon && (
                  <span className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    View
                  </span>
                )}
              </div>
            </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
