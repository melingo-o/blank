"use client"

import { useEffect, useRef, useState } from "react"

const pipeline = [
  {
    key: "analysis",
    title: "ANALYSIS",
    label: "Signal Capture",
    lines: ["우리만의 뮤즈 찾기"],
    items: [
      {
        title: "Influencer Discovery",
        description: "성장 가능성이 높은 크리에이터를 선별합니다"
      },
      {
        title: "VIBE Profiling",
        description: "무드와 톤을 데이터로 구조화합니다"
      }
    ]
  },
  {
    key: "matching",
    title: "MATCHING",
    label: "Audience Match",
    lines: ["타겟이 열광하는 컨텐츠 연결"],
    items: [
      {
        title: "Creative Directing",
        description: "인플루언서 고유 무드에 최적화된 컨텐츠 기획"
      },
      {
        title: "Performance Growth",
        description: "데이터 기반의 팔로워 및 인게이지먼트 최적화"
      }
    ]
  },
  {
    key: "conversion",
    title: "CONVERSION",
    label: "Conversion Design",
    lines: ["유기적인 커머스 설계"],
    items: [
      {
        title: "Monetization Strategy",
        description: "팬덤의 열기를 구매로 전환합니다"
      },
      {
        title: "Commerce Architecture",
        description: "브랜드와 D2C 흐름을 자연스럽게 설계합니다"
      }
    ]
  }
]

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!sectionRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative scroll-mt-28 bg-background py-16"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="max-w-4xl">
            <span className="text-xs uppercase tracking-[0.4em] text-foreground/60">
              ABOUT
            </span>
            <h2 className="mt-4 font-serif text-4xl text-foreground md:text-5xl">
              숫자 이상의 기준
            </h2>
            <div className="mt-4 flex items-start gap-3">
              <span className="mt-1 h-5 w-0.5 bg-foreground/60" />
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                팔로워 수에 집착하지 않습니다. 인플루언서의 고유한 결(VIBE)을
                분석하여, 컨텐츠와 연결합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-border/60 bg-card/70 p-8 boty-shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                TASK ALGORITHM
              </span>
            </div>
          </div>

          <span id="services" className="block h-0 scroll-mt-28" />

          <div className="relative mt-8 grid gap-6 md:grid-cols-3">
            <div className="pointer-events-none absolute left-6 right-6 top-1/2 hidden h-px bg-border/60 md:block" />
            {pipeline.map((step, index) => (
              <div
                key={step.key}
                className={`relative z-10 rounded-2xl border border-border/60 bg-background/90 p-6 backdrop-blur transition-all duration-700 ease-out ${
                  isVisible
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-6 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    0{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {step.title}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {step.label}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {step.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>

                {step.items ? (
                  <div className="mt-5 space-y-4 border-l border-border/60 pl-4">
                    {step.items.map((item) => (
                      <div key={item.title} className="relative">
                        <span className="absolute -left-[22px] top-2 h-2 w-2 rounded-full bg-primary/70" />
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
