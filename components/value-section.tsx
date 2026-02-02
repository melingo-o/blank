"use client"

import { BarChart3, Link2, Zap } from "lucide-react"

const keywords = [
  {
    title: "Analysis",
    description: "인플루언서 고유 결(Vibe) 분석",
    icon: BarChart3
  },
  {
    title: "Matching",
    description: "타겟이 열광하는 컨텐츠 연결",
    icon: Link2
  },
  {
    title: "Conversion",
    description: "자연스러운 전환 설계",
    icon: Zap
  }
]

export function ValueSection() {
  return (
    <section
      id="about"
      className="relative scroll-mt-28 overflow-hidden bg-background py-24"
    >
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.4em] text-foreground/60">
              About & Value
            </span>
            <h2 className="mt-4 font-serif text-4xl text-foreground md:text-5xl">
              단순한 팔로워 수에 집착하지 않습니다.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            우리는 인플루언서의 고유한 결(Vibe)을 분석하여, 타겟이 열광하는
            컨텐츠와 연결합니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {keywords.map((keyword) => (
            <div
              key={keyword.title}
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <keyword.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {keyword.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {keyword.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
