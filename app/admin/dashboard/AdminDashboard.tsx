"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabase/client"
import { defaultPortfolioItems, defaultTeamMembers } from "@/lib/seed-data"
import type {
  PortfolioItem,
  TeamMember,
  Submission
} from "@/lib/supabase/types"

const STORAGE_BUCKET = "influencer-images"

const portfolioSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  niche: z.string().min(1, "분야를 입력해 주세요."),
  followers: z.string().min(1, "팔로워 수치를 입력해 주세요."),
  growth: z.string().min(1, "성장 수치를 입력해 주세요."),
  image_url: z
    .string()
    .min(1, "이미지 경로를 입력해 주세요.")
    .refine((value) => value.startsWith("http") || value.startsWith("/"), {
      message: "URL 또는 /로 시작하는 경로를 입력해 주세요."
    }),
  instagram_handle: z
    .string()
    .max(50, "아이디는 50자 이하로 입력해 주세요.")
    .optional()
    .or(z.literal("")),
  order_index: z.coerce.number().int().min(0, "정렬 값은 0 이상이어야 합니다.")
})

const teamSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  nickname: z.string().min(1, "닉네임을 입력해 주세요."),
  role: z.string().min(1, "역할을 입력해 주세요."),
  focus: z.string().min(1, "담당 영역을 입력해 주세요."),
  order_index: z.coerce.number().int().min(0, "정렬 값은 0 이상이어야 합니다.")
})

type PortfolioValues = z.infer<typeof portfolioSchema>
type TeamValues = z.infer<typeof teamSchema>

type AdminDashboardProps = {
  initialPortfolio: PortfolioItem[]
  initialTeam: TeamMember[]
  initialSubmissions: Submission[]
}

export default function AdminDashboard({
  initialPortfolio,
  initialTeam,
  initialSubmissions
}: AdminDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    "portfolio" | "team" | "submissions"
  >("portfolio")
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initialPortfolio)
  const [team, setTeam] = useState<TeamMember[]>(initialTeam)
  const [submissions, setSubmissions] =
    useState<Submission[]>(initialSubmissions)
  const [selectedPortfolio, setSelectedPortfolio] =
    useState<PortfolioItem | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamMember | null>(null)
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null)
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(
    null
  )
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [portfolioCreateError, setPortfolioCreateError] = useState<
    string | null
  >(null)
  const [portfolioOrderError, setPortfolioOrderError] = useState<string | null>(
    null
  )
  const [portfolioOrderDrafts, setPortfolioOrderDrafts] = useState<
    Record<string, number>
  >({})
  const [teamCreateError, setTeamCreateError] = useState<string | null>(null)
  const [teamOrderError, setTeamOrderError] = useState<string | null>(null)
  const [teamOrderDrafts, setTeamOrderDrafts] = useState<
    Record<string, number>
  >({})
  const supabase = useMemo(() => createSupabaseBrowser(), [])
  const sortedPortfolio = useMemo(
    () =>
      [...portfolio].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [portfolio]
  )
  const sortedTeam = useMemo(
    () => [...team].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [team]
  )

  const portfolioForm = useForm<PortfolioValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      name: "",
      niche: "",
      followers: "",
      growth: "",
      image_url: "",
      instagram_handle: "",
      order_index: 0
    }
  })

  const teamForm = useForm<TeamValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      nickname: "",
      role: "",
      focus: "",
      order_index: 0
    }
  })

  const refreshPortfolio = useCallback(async () => {
    const { data } = await supabase
      .from("portfolio_items")
      .select("*")
      .order("order_index", { ascending: true })
    if (data) setPortfolio(data)
  }, [supabase])

  const refreshTeam = useCallback(async () => {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .order("order_index", { ascending: true })
    if (data) setTeam(data)
  }, [supabase])

  const refreshSubmissions = useCallback(async () => {
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setSubmissions(data)
  }, [supabase])

  useEffect(() => {
    refreshPortfolio()
    refreshTeam()
    refreshSubmissions()

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolio_items" },
        () => refreshPortfolio()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        () => refreshTeam()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => refreshSubmissions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshPortfolio, refreshSubmissions, refreshTeam, supabase])

  useEffect(() => {
    const next: Record<string, number> = {}
    portfolio.forEach((item) => {
      next[item.id] = (item.order_index ?? 0) + 1
    })
    setPortfolioOrderDrafts(next)
  }, [portfolio])

  useEffect(() => {
    const next: Record<string, number> = {}
    team.forEach((member) => {
      next[member.id] = (member.order_index ?? 0) + 1
    })
    setTeamOrderDrafts(next)
  }, [team])

  useEffect(() => {
    setSelectedPortfolio(null)
    setSelectedTeam(null)
    setSelectedSubmission(null)
    setEditingPortfolioId(null)
    setEditingTeamId(null)
  }, [activeTab])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/admin")
    router.refresh()
  }

  const handleCreatePortfolio = async (values: PortfolioValues) => {
    setPortfolioCreateError(null)
    const trimmedHandle = values.instagram_handle?.trim()
    const payload = {
      ...values,
      instagram_handle: trimmedHandle ? trimmedHandle : null
    }
    const { error } = await supabase.from("portfolio_items").insert(payload)
    if (error) {
      setPortfolioCreateError(
        error.message || "포트폴리오 저장에 실패했습니다."
      )
      return
    }
    if (!error) {
      portfolioForm.reset()
      refreshPortfolio()
    }
  }

  const uploadPortfolioImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setUploadError("이미지 파일만 업로드할 수 있습니다.")
        return null
      }

      setUploadingImage(true)
      setUploadError(null)

      try {
        const extension = file.name.split(".").pop() || "png"
        const randomId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
        const filePath = `portfolio/${randomId}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
          })

        if (uploadError) {
          setUploadError("이미지 업로드에 실패했습니다.")
          return null
        }

        const { data } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath)

        return data.publicUrl
      } finally {
        setUploadingImage(false)
      }
    },
    [supabase]
  )

  const handleCreateTeam = async (values: TeamValues) => {
    setTeamCreateError(null)
    const { error } = await supabase.from("team_members").insert(values)
    if (error) {
      setTeamCreateError(error.message || "팀 데이터 저장에 실패했습니다.")
      return
    }
    if (!error) {
      teamForm.reset()
      refreshTeam()
    }
  }

  const handleTogglePortfolioVisibility = async (
    item: PortfolioItem,
    nextVisible: boolean
  ) => {
    const { error } = await supabase
      .from("portfolio_items")
      .update({ is_visible: nextVisible })
      .eq("id", item.id)

    if (!error) {
      setPortfolio((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                is_visible: nextVisible
              }
            : entry
        )
      )
      if (selectedPortfolio?.id === item.id) {
        setSelectedPortfolio({
          ...selectedPortfolio,
          is_visible: nextVisible
        })
      }
    }
  }

  const handleUpdatePortfolioOrder = async (
    itemId: string,
    displayOrder: number
  ) => {
    setPortfolioOrderError(null)
    const normalized = Number.isFinite(displayOrder)
      ? Math.max(1, Math.floor(displayOrder))
      : 1
    const nextOrderIndex = normalized - 1

    const { error } = await supabase
      .from("portfolio_items")
      .update({ order_index: nextOrderIndex })
      .eq("id", itemId)

    if (error) {
      setPortfolioOrderError("정렬 순서를 변경하지 못했습니다.")
      return
    }

    refreshPortfolio()
  }

  const handleUpdateTeamOrder = async (
    memberId: string,
    displayOrder: number
  ) => {
    setTeamOrderError(null)
    const normalized = Number.isFinite(displayOrder)
      ? Math.max(1, Math.floor(displayOrder))
      : 1
    const nextOrderIndex = normalized - 1

    const { error } = await supabase
      .from("team_members")
      .update({ order_index: nextOrderIndex })
      .eq("id", memberId)

    if (error) {
      setTeamOrderError("정렬 순서를 변경하지 못했습니다.")
      return
    }

    refreshTeam()
  }
  const handleSeedPortfolio = async () => {
    const { data } = await supabase
      .from("portfolio_items")
      .select("id")
      .limit(1)

    if (data && data.length > 0) {
      const confirmed = confirm(
        "이미 등록된 데이터가 있습니다. 기본 데이터를 추가로 넣을까요?"
      )
      if (!confirmed) return
    }

    const { error } = await supabase
      .from("portfolio_items")
      .insert(defaultPortfolioItems)

    if (!error) {
      refreshPortfolio()
    }
  }

  const handleSeedTeam = async () => {
    const { data } = await supabase.from("team_members").select("id").limit(1)

    if (data && data.length > 0) {
      const confirmed = confirm(
        "이미 등록된 데이터가 있습니다. 기본 데이터를 추가로 넣을까요?"
      )
      if (!confirmed) return
    }

    const { error } = await supabase
      .from("team_members")
      .insert(defaultTeamMembers)

    if (!error) {
      refreshTeam()
    }
  }

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("포트폴리오 항목을 삭제할까요?")) return
    await supabase.from("portfolio_items").delete().eq("id", id)
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm("팀 멤버를 삭제할까요?")) return
    await supabase.from("team_members").delete().eq("id", id)
  }

  const handleStatusChange = async (id: string, status: Submission["status"]) => {
    await supabase.from("submissions").update({ status }).eq("id", id)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              콘텐츠 관리
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-border/60 px-5 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
            >
              뒤로가기
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-border/60 px-5 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { key: "portfolio", label: "Portfolio" },
            { key: "team", label: "Team" },
            { key: "submissions", label: "Submissions" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setActiveTab(tab.key as "portfolio" | "team" | "submissions")
              }
              className={`px-6 py-3 text-xs uppercase tracking-[0.3em] transition ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "portfolio" && (
          <section className="mt-10 space-y-10">
            <div className="rounded-3xl border border-border/60 bg-card p-8 boty-shadow">
              <h2 className="text-xl font-semibold text-foreground">
                인플루언서 추가
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                등록된 데이터 {portfolio.length}개
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSeedPortfolio}
                  className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                >
                  기본 데이터 불러오기
                </button>
              </div>
              <form
                onSubmit={portfolioForm.handleSubmit(handleCreatePortfolio)}
                className="mt-6 grid gap-4 md:grid-cols-2"
              >
                {portfolioCreateError && (
                  <p className="md:col-span-2 text-xs text-destructive">
                    {portfolioCreateError}
                  </p>
                )}
                <div>
                  <input
                    placeholder="이름"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...portfolioForm.register("name")}
                  />
                  {portfolioForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-destructive">
                      {portfolioForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    placeholder="분야"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...portfolioForm.register("niche")}
                  />
                  {portfolioForm.formState.errors.niche && (
                    <p className="mt-1 text-xs text-destructive">
                      {portfolioForm.formState.errors.niche.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    placeholder="팔로워"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...portfolioForm.register("followers")}
                  />
                  {portfolioForm.formState.errors.followers && (
                    <p className="mt-1 text-xs text-destructive">
                      {portfolioForm.formState.errors.followers.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    placeholder="성장 수치"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...portfolioForm.register("growth")}
                  />
                  {portfolioForm.formState.errors.growth && (
                    <p className="mt-1 text-xs text-destructive">
                      {portfolioForm.formState.errors.growth.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const publicUrl = await uploadPortfolioImage(file)
                      if (publicUrl) {
                        portfolioForm.setValue("image_url", publicUrl, {
                          shouldValidate: true
                        })
                      }
                    }}
                    className="w-full bg-muted px-4 py-3 text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.25em] file:text-background"
                  />
                  {uploadError && (
                    <p className="mt-2 text-xs text-destructive">
                      {uploadError}
                    </p>
                  )}
                  {uploadingImage && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      이미지 업로드 중...
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <input
                    placeholder="이미지 URL (자동 입력)"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    readOnly
                    {...portfolioForm.register("image_url")}
                  />
                  {portfolioForm.formState.errors.image_url && (
                    <p className="mt-1 text-xs text-destructive">
                      {portfolioForm.formState.errors.image_url.message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <input
                    placeholder="인스타그램 계정"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...portfolioForm.register("instagram_handle")}
                  />
                  {portfolioForm.formState.errors.instagram_handle && (
                    <p className="mt-1 text-xs text-destructive">
                      {portfolioForm.formState.errors.instagram_handle.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="정렬 순서"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...portfolioForm.register("order_index")}
                  />
                  {portfolioForm.formState.errors.order_index && (
                    <p className="mt-1 text-xs text-destructive">
                      {portfolioForm.formState.errors.order_index.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <button
                    type="submit"
                    className="w-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground"
                    disabled={
                      portfolioForm.formState.isSubmitting || uploadingImage
                    }
                  >
                    {portfolioForm.formState.isSubmitting
                      ? "저장 중..."
                      : "추가하기"}
                  </button>
                </div>
              </form>
            </div>

            {selectedPortfolio && (
              <div className="rounded-3xl border border-border/60 bg-card p-6 boty-shadow">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Influencer View
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-foreground">
                      {selectedPortfolio.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPortfolio(null)}
                    className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground"
                  >
                    목록으로 돌아가기
                  </button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Niche
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedPortfolio.niche}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Followers
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedPortfolio.followers}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Growth
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedPortfolio.growth}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Instagram
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedPortfolio.instagram_handle
                        ? selectedPortfolio.instagram_handle.startsWith("@")
                          ? selectedPortfolio.instagram_handle
                          : `@${selectedPortfolio.instagram_handle}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Order
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedPortfolio.order_index}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Visible
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedPortfolio.is_visible ? "ON" : "OFF"}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Image
                  </p>
                  <p className="mt-2 text-sm text-foreground break-all">
                    {selectedPortfolio.image_url}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-12 rounded-3xl border border-border/60 bg-card/80 p-8 boty-shadow">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Influencer List
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">
                    인플루언서 목록
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    순서 입력 후 포커스를 이동하면 노출 순서가 저장됩니다.
                  </p>
                </div>
                {portfolioOrderError && (
                  <p className="text-xs text-destructive">
                    {portfolioOrderError}
                  </p>
                )}
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                  </colgroup>
                  <thead className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <tr>
                      <th className="pb-3 px-2">이름</th>
                      <th className="pb-3 px-2">인스타</th>
                      <th className="pb-3 px-2">분야</th>
                      <th className="pb-3 px-2">View</th>
                      <th className="pb-3 px-2">순서</th>
                      <th className="pb-3 px-2 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {sortedPortfolio.map((item) => (
                      <Fragment key={item.id}>
                        <tr className="border-t border-border/60 align-top">
                          <td className="py-4 px-2 font-semibold">
                            {item.name}
                          </td>
                          <td className="py-4 px-2 text-xs text-muted-foreground">
                            {item.instagram_handle
                              ? item.instagram_handle.startsWith("@")
                                ? item.instagram_handle
                                : `@${item.instagram_handle}`
                              : "-"}
                          </td>
                          <td className="py-4 px-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            {item.niche}
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                                View
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleTogglePortfolioVisibility(
                                    item,
                                    !item.is_visible
                                  )
                                }
                                aria-pressed={item.is_visible}
                                className={`relative h-6 w-11 rounded-full border border-border/60 transition ${
                                  item.is_visible
                                    ? "bg-emerald-500/80"
                                    : "bg-rose-500/80"
                                }`}
                              >
                                <span
                                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform ${
                                    item.is_visible ? "translate-x-5" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <input
                              type="number"
                              min={1}
                              value={portfolioOrderDrafts[item.id] ?? 1}
                              onChange={(event) => {
                                const nextValue = Number(event.target.value)
                                setPortfolioOrderDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: Number.isNaN(nextValue)
                                    ? 0
                                    : nextValue
                                }))
                              }}
                              onBlur={(event) =>
                                handleUpdatePortfolioOrder(
                                  item.id,
                                  Number(event.target.value)
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.currentTarget.blur()
                                }
                              }}
                              className="w-16 rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] text-foreground outline-none"
                            />
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="flex flex-col items-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPortfolio(item)
                                  setEditingPortfolioId(null)
                                }}
                                className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                              >
                                상세보기
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingPortfolioId(
                                    editingPortfolioId === item.id
                                      ? null
                                      : item.id
                                  )
                                }
                                className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePortfolio(item.id)}
                                className="rounded-full border border-destructive/50 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-destructive"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editingPortfolioId === item.id && (
                          <tr className="border-t border-border/60">
                            <td colSpan={6} className="px-2 pb-6">
                              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                <PortfolioEditForm
                                  item={item}
                                  onCancel={() => setEditingPortfolioId(null)}
                                  onSaved={() => setEditingPortfolioId(null)}
                                  supabase={supabase}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {sortedPortfolio.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-muted-foreground"
                        >
                          등록된 인플루언서가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "team" && (
          <section className="mt-10 space-y-10">
            <div className="rounded-3xl border border-border/60 bg-card p-8 boty-shadow">
              <h2 className="text-xl font-semibold text-foreground">
                팀 멤버 추가
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                등록된 데이터 {team.length}개
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSeedTeam}
                  className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                >
                  기본 데이터 불러오기
                </button>
              </div>
              <form
                onSubmit={teamForm.handleSubmit(handleCreateTeam)}
                className="mt-6 grid gap-4 md:grid-cols-2"
              >
                {teamCreateError && (
                  <p className="md:col-span-2 text-xs text-destructive">
                    {teamCreateError}
                  </p>
                )}
                <div>
                  <input
                    placeholder="이름"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...teamForm.register("name")}
                  />
                  {teamForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-destructive">
                      {teamForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    placeholder="닉네임"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...teamForm.register("nickname")}
                  />
                  {teamForm.formState.errors.nickname && (
                    <p className="mt-1 text-xs text-destructive">
                      {teamForm.formState.errors.nickname.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    placeholder="역할"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...teamForm.register("role")}
                  />
                  {teamForm.formState.errors.role && (
                    <p className="mt-1 text-xs text-destructive">
                      {teamForm.formState.errors.role.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    placeholder="담당 영역"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...teamForm.register("focus")}
                  />
                  {teamForm.formState.errors.focus && (
                    <p className="mt-1 text-xs text-destructive">
                      {teamForm.formState.errors.focus.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="정렬 순서"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...teamForm.register("order_index")}
                  />
                  {teamForm.formState.errors.order_index && (
                    <p className="mt-1 text-xs text-destructive">
                      {teamForm.formState.errors.order_index.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <button
                    type="submit"
                    className="w-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground"
                    disabled={teamForm.formState.isSubmitting}
                  >
                    {teamForm.formState.isSubmitting
                      ? "저장 중..."
                      : "추가하기"}
                  </button>
                </div>
              </form>
            </div>

            {selectedTeam && (
              <div className="rounded-3xl border border-border/60 bg-card p-6 boty-shadow">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Team View
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-foreground">
                      {selectedTeam.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam(null)}
                    className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground"
                  >
                    목록으로 돌아가기
                  </button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Nickname
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedTeam.nickname}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Role
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedTeam.role}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Focus
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedTeam.focus}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Order
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedTeam.order_index}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-12 rounded-3xl border border-border/60 bg-card/80 p-8 boty-shadow">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Team List
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">
                    팀 목록
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    순서 입력 후 포커스를 이동하면 노출 순서가 저장됩니다.
                  </p>
                </div>
                {teamOrderError && (
                  <p className="text-xs text-destructive">{teamOrderError}</p>
                )}
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                  </colgroup>
                  <thead className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <tr>
                      <th className="pb-3 px-2">이름</th>
                      <th className="pb-3 px-2">닉네임</th>
                      <th className="pb-3 px-2">역할</th>
                      <th className="pb-3 px-2">담당</th>
                      <th className="pb-3 px-2">순서</th>
                      <th className="pb-3 px-2 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {sortedTeam.map((member) => (
                      <Fragment key={member.id}>
                        <tr className="border-t border-border/60 align-top">
                          <td className="py-4 px-2 font-semibold">
                            {member.name}
                          </td>
                          <td className="py-4 px-2 text-xs text-muted-foreground">
                            {member.nickname}
                          </td>
                          <td className="py-4 px-2 text-xs text-muted-foreground">
                            {member.role}
                          </td>
                          <td className="py-4 px-2 text-xs text-muted-foreground">
                            {member.focus}
                          </td>
                          <td className="py-4 px-2">
                            <input
                              type="number"
                              min={1}
                              value={teamOrderDrafts[member.id] ?? 1}
                              onChange={(event) => {
                                const nextValue = Number(event.target.value)
                                setTeamOrderDrafts((prev) => ({
                                  ...prev,
                                  [member.id]: Number.isNaN(nextValue)
                                    ? 0
                                    : nextValue
                                }))
                              }}
                              onBlur={(event) =>
                                handleUpdateTeamOrder(
                                  member.id,
                                  Number(event.target.value)
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.currentTarget.blur()
                                }
                              }}
                              className="w-16 rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] text-foreground outline-none"
                            />
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="flex flex-col items-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTeam(member)
                                  setEditingTeamId(null)
                                }}
                                className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                              >
                                상세보기
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingTeamId(
                                    editingTeamId === member.id
                                      ? null
                                      : member.id
                                  )
                                }
                                className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTeam(member.id)}
                                className="rounded-full border border-destructive/50 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-destructive"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editingTeamId === member.id && (
                          <tr className="border-t border-border/60">
                            <td colSpan={6} className="px-2 pb-6">
                              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                <TeamEditForm
                                  item={member}
                                  onCancel={() => setEditingTeamId(null)}
                                  onSaved={() => setEditingTeamId(null)}
                                  supabase={supabase}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {sortedTeam.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-muted-foreground"
                        >
                          등록된 팀 멤버가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "submissions" && (
          <section className="mt-10">
            <div className="rounded-3xl border border-border/60 bg-card p-6 boty-shadow">
              <h2 className="text-xl font-semibold text-foreground">
                제안 목록
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                접수된 제안 {submissions.length}개
              </p>
              {selectedSubmission && (
                <div className="mt-6 rounded-2xl border border-border/60 bg-muted/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Submission View
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {selectedSubmission.type === "apply"
                          ? selectedSubmission.name
                          : selectedSubmission.company}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(null)}
                      className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground"
                    >
                      목록으로 돌아가기
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Contact
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {selectedSubmission.type === "apply"
                          ? selectedSubmission.phone
                          : selectedSubmission.contact}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {selectedSubmission.status}
                      </p>
                    </div>
                    {selectedSubmission.type === "business" && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Budget
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {selectedSubmission.budget}
                        </p>
                      </div>
                    )}
                    {selectedSubmission.type === "apply" && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          SNS
                        </p>
                        <p className="mt-1 text-sm text-foreground break-all">
                          {selectedSubmission.sns}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Message
                    </p>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-line">
                      {selectedSubmission.type === "apply"
                        ? selectedSubmission.intro
                        : selectedSubmission.details}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-6 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <tr>
                      <th className="pb-3">유형</th>
                      <th className="pb-3">이름/회사</th>
                      <th className="pb-3">연락처</th>
                      <th className="pb-3">내용</th>
                      <th className="pb-3">상태</th>
                      <th className="pb-3">접수일</th>
                      <th className="pb-3 text-right">보기</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-t border-border/60"
                      >
                        <td className="py-4 uppercase text-xs tracking-[0.2em]">
                          {submission.type}
                        </td>
                        <td className="py-4">
                          {submission.type === "apply"
                            ? submission.name
                            : submission.company}
                        </td>
                        <td className="py-4">
                          {submission.type === "apply"
                            ? submission.phone
                            : submission.contact}
                        </td>
                        <td className="py-4 max-w-[240px] text-muted-foreground">
                          {submission.type === "apply"
                            ? submission.intro
                            : submission.details}
                        </td>
                        <td className="py-4">
                          <select
                            className="bg-muted px-3 py-2 text-xs uppercase tracking-[0.2em] outline-none"
                            value={submission.status}
                            onChange={(event) =>
                              handleStatusChange(
                                submission.id,
                                event.target.value as Submission["status"]
                              )
                            }
                          >
                            <option value="new">new</option>
                            <option value="reviewed">reviewed</option>
                            <option value="archived">archived</option>
                          </select>
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {new Date(submission.created_at).toLocaleString(
                            "ko-KR"
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedSubmission(submission)}
                            className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                    {submissions.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-muted-foreground"
                        >
                          접수된 제안이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

type EditFormProps<T> = {
  item: T
  onCancel: () => void
  onSaved: () => void
  supabase: ReturnType<typeof createSupabaseBrowser>
}

function PortfolioEditForm({
  item,
  onCancel,
  onSaved,
  supabase
}: EditFormProps<PortfolioItem>) {
  const form = useForm<PortfolioValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      name: item.name,
      niche: item.niche,
      followers: item.followers,
      growth: item.growth,
      image_url: item.image_url,
      instagram_handle: item.instagram_handle ?? "",
      order_index: item.order_index
    }
  })

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 업로드할 수 있습니다.")
      return null
    }

    setUploading(true)
    setUploadError(null)

    try {
      const extension = file.name.split(".").pop() || "png"
      const randomId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
      const filePath = `portfolio/${randomId}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        })

      if (uploadError) {
        setUploadError("이미지 업로드에 실패했습니다.")
        return null
      }

      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath)

      return data.publicUrl
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (values: PortfolioValues) => {
    const trimmedHandle = values.instagram_handle?.trim()
    const payload = {
      ...values,
      instagram_handle: trimmedHandle ? trimmedHandle : null
    }
    const { error } = await supabase
      .from("portfolio_items")
      .update(payload)
      .eq("id", item.id)
    if (!error) {
      onSaved()
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("name")}
        />
        <input
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("niche")}
        />
        <input
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("followers")}
        />
        <input
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("growth")}
        />
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const publicUrl = await uploadImage(file)
            if (publicUrl) {
              form.setValue("image_url", publicUrl, { shouldValidate: true })
            }
          }}
          className="w-full bg-muted px-4 py-3 text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.25em] file:text-background md:col-span-2"
        />
        {uploadError && (
          <p className="text-xs text-destructive md:col-span-2">
            {uploadError}
          </p>
        )}
        {uploading && (
          <p className="text-xs text-muted-foreground md:col-span-2">
            이미지 업로드 중...
          </p>
        )}
        <input
          placeholder="이미지 URL (자동 입력)"
          className="w-full bg-muted px-4 py-3 text-sm outline-none md:col-span-2"
          readOnly
          {...form.register("image_url")}
        />
        <input
          placeholder="인스타그램 계정"
          className="w-full bg-muted px-4 py-3 text-sm outline-none md:col-span-2"
          {...form.register("instagram_handle")}
        />
        <input
          type="number"
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("order_index")}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-[0.25em] text-primary-foreground"
          disabled={form.formState.isSubmitting || uploading}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  )
}

function TeamEditForm({
  item,
  onCancel,
  onSaved,
  supabase
}: EditFormProps<TeamMember>) {
  const form = useForm<TeamValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: item.name,
      nickname: item.nickname,
      role: item.role,
      focus: item.focus,
      order_index: item.order_index
    }
  })

  const onSubmit = async (values: TeamValues) => {
    const { error } = await supabase
      .from("team_members")
      .update(values)
      .eq("id", item.id)
    if (!error) {
      onSaved()
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("name")}
        />
        <input
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("nickname")}
        />
        <input
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("role")}
        />
        <input
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("focus")}
        />
        <input
          type="number"
          className="w-full bg-muted px-4 py-3 text-sm outline-none"
          {...form.register("order_index")}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-[0.25em] text-primary-foreground"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  )
}
