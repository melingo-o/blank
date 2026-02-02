"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createSupabaseBrowser } from "@/lib/supabase/client"

type TeamDisplay = {
  id?: string
  name: string
  nickname: string
  role: string
  focus: string
}

const team: TeamDisplay[] = [
  {
    name: "김서연",
    nickname: "Signal",
    role: "Creative Lead",
    focus: "컨텐츠 디렉팅 · 무드 설계"
  },
  {
    name: "박준호",
    nickname: "Pulse",
    role: "Growth Strategy",
    focus: "데이터 분석 · 전환 설계"
  },
  {
    name: "이하린",
    nickname: "Linker",
    role: "Creator Relations",
    focus: "섭외 · 파트너십 운영"
  },
  {
    name: "최도윤",
    nickname: "Frame",
    role: "Visual Producer",
    focus: "촬영 · 편집 · 퀄리티"
  }
]

type TeamSectionProps = {
  initialMembers?: TeamDisplay[]
}

export function TeamSection({ initialMembers }: TeamSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [members, setMembers] = useState<TeamDisplay[]>(
    initialMembers && initialMembers.length > 0 ? initialMembers : team
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
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .order("order_index", { ascending: true })

      if (isMounted && data) {
        setMembers(data)
      }
    }

    load()

    const channel = supabase
      .channel("team-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
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
      id="team"
      ref={sectionRef}
      className="relative scroll-mt-28 bg-background py-16"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="max-w-4xl">
            <span className="text-xs uppercase tracking-[0.4em] text-foreground/60">
              TEAM
            </span>
            <h2 className="mt-4 font-serif text-4xl text-foreground md:text-5xl">
              트렌드를 만드는 사람들
            </h2>
            <div className="mt-4 flex items-start gap-3">
              <span className="mt-1 h-5 w-0.5 bg-foreground/60" />
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                에너지와 실행력이 곧 성과로 이어집니다. 가장 젊고, 가장 기민하게
                움직이는 유닛입니다.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-border/60 bg-card boty-shadow">
          <div className="relative h-64 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
              alt="Team mood"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                Team Snapshot
              </p>
              <h3 className="mt-2 text-2xl font-semibold">
                각 분야의 전문가들이 한 팀으로 움직입니다.
              </h3>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {members.map((member, index) => (
            <div
              key={member.id ?? member.name}
              className={`relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 boty-shadow transition-all duration-700 ease-out hover:-translate-y-1 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-6 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-foreground">
                    {member.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {member.nickname}
                  </p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {member.role}
                </span>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                {member.focus}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
