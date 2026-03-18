"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import type { CreatorWorkspaceAccount } from "@/lib/supabase/types"

const issueAccountSchema = z.object({
  loginEmail: z.string().email("올바른 로그인 이메일을 입력하세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.")
})

type IssueAccountValues = z.infer<typeof issueAccountSchema>

type AdminCreatorApiCaller = (options?: {
  method?: "GET" | "POST"
  body?: Record<string, unknown>
}) => Promise<{
  ok?: boolean
  creator?: CreatorWorkspaceAccount
}>

type CreatorWorkspaceManagerProps = {
  creators: CreatorWorkspaceAccount[]
  selectedCreatorId: string | null
  onSelectCreator: (creatorId: string) => void
  onRefreshCreators: () => Promise<void> | void
  onCreatorsChanged: (preferredCreatorId?: string | null) => Promise<void> | void
  callAdminCreatorApi: AdminCreatorApiCaller
  onOpenWorkspace: (workspacePath: string) => Promise<void> | void
}

function generateTempPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*"

  return Array.from({ length: 12 }, () => {
    const index = Math.floor(Math.random() * alphabet.length)
    return alphabet[index]
  }).join("")
}

function hasIssuedAccount(creator: CreatorWorkspaceAccount) {
  return Boolean(creator.auth_user_id || creator.login_email)
}

export default function CreatorWorkspaceManager({
  creators,
  selectedCreatorId,
  onSelectCreator,
  onRefreshCreators,
  onCreatorsChanged,
  callAdminCreatorApi,
  onOpenWorkspace
}: CreatorWorkspaceManagerProps) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})
  const [resettingCreatorId, setResettingCreatorId] = useState<string | null>(
    null
  )
  const [createdCredential, setCreatedCredential] = useState<{
    creatorId: string
    loginEmail: string
    password: string
  } | null>(null)

  const issuedCreators = useMemo(
    () => creators.filter((creator) => hasIssuedAccount(creator)),
    [creators]
  )
  const pendingCreators = useMemo(
    () => creators.filter((creator) => !hasIssuedAccount(creator)),
    [creators]
  )
  const selectedCreator = useMemo(() => {
    const matchedCreator = creators.find((creator) => creator.id === selectedCreatorId)

    if (matchedCreator) {
      return matchedCreator
    }

    return pendingCreators[0] || creators[0] || null
  }, [creators, pendingCreators, selectedCreatorId])

  const form = useForm<IssueAccountValues>({
    resolver: zodResolver(issueAccountSchema),
    defaultValues: {
      loginEmail: "",
      password: generateTempPassword()
    }
  })

  useEffect(() => {
    if (!selectedCreator) {
      return
    }

    if (selectedCreator.id !== selectedCreatorId) {
      onSelectCreator(selectedCreator.id)
    }
  }, [onSelectCreator, selectedCreator, selectedCreatorId])

  useEffect(() => {
    form.reset({
      loginEmail: selectedCreator?.login_email || "",
      password: generateTempPassword()
    })
    setError(null)
  }, [form, selectedCreator])

  useEffect(() => {
    setResetPasswords((prev) => {
      const nextDrafts: Record<string, string> = {}

      issuedCreators.forEach((creator) => {
        nextDrafts[creator.id] = prev[creator.id] || ""
      })

      return nextDrafts
    })
  }, [issuedCreators])

  const handleIssueAccount = async (values: IssueAccountValues) => {
    if (!selectedCreator) {
      setError("먼저 크리에이터를 등록하세요.")
      return
    }

    if (hasIssuedAccount(selectedCreator)) {
      setError("이미 계정이 생성된 크리에이터입니다.")
      return
    }

    setError(null)
    setNotice(null)

    try {
      const payload = await callAdminCreatorApi({
        method: "POST",
        body: {
          action: "issueCreatorAccount",
          payload: {
            creatorId: selectedCreator.id,
            loginEmail: values.loginEmail,
            password: values.password
          }
        }
      })

      setCreatedCredential({
        creatorId: payload.creator?.id || selectedCreator.id,
        loginEmail: payload.creator?.login_email || values.loginEmail,
        password: values.password
      })
      setNotice(`${selectedCreator.name} 계정을 생성했습니다.`)
      form.reset({
        loginEmail: payload.creator?.login_email || values.loginEmail,
        password: generateTempPassword()
      })
      await onCreatorsChanged(selectedCreator.id)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "크리에이터 계정을 생성하지 못했습니다."
      )
    }
  }

  const handleResetPassword = async (creatorId: string) => {
    const password = resetPasswords[creatorId]?.trim()

    if (!password || password.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.")
      return
    }

    setError(null)
    setNotice(null)
    setResettingCreatorId(creatorId)

    try {
      await callAdminCreatorApi({
        method: "POST",
        body: {
          action: "resetCreatorPassword",
          payload: {
            creatorId,
            password
          }
        }
      })

      setNotice(`${creatorId} 계정 비밀번호를 변경했습니다.`)
      setResetPasswords((prev) => ({
        ...prev,
        [creatorId]: ""
      }))
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "비밀번호를 재설정하지 못했습니다."
      )
    } finally {
      setResettingCreatorId(null)
    }
  }

  if (creators.length === 0) {
    return (
      <section className="mt-10">
        <div className="rounded-3xl border border-dashed border-border/60 bg-card px-8 py-14 text-center text-sm text-muted-foreground">
          먼저 크리에이터 탭에서 계약 크리에이터를 등록하세요.
        </div>
      </section>
    )
  }

  return (
    <section className="mt-10 space-y-8">
      <div className="rounded-3xl border border-border/60 bg-card p-8 boty-shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Account Setup
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              계정생성
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              등록된 크리에이터를 선택해 로그인 계정을 발급하고, 이미 발급된
              계정은 워크스페이스 접속과 비밀번호 재설정을 바로 관리할 수
              있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onRefreshCreators()}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
          >
            Refresh
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Creator
            </label>
            <select
              value={selectedCreator?.id || ""}
              onChange={(event) => onSelectCreator(event.target.value)}
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
            >
              {creators.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name} / {creator.channel_name} /{" "}
                  {hasIssuedAccount(creator) ? "발급완료" : "미발급"}
                </option>
              ))}
            </select>

            {selectedCreator && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {selectedCreator.id}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
                      hasIssuedAccount(selectedCreator)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {hasIssuedAccount(selectedCreator)
                      ? "계정생성 완료"
                      : "계정 미발급"}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedCreator.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedCreator.channel_name}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Join date
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedCreator.join_date}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Login email
                    </p>
                    <p className="mt-2 break-all text-sm text-foreground">
                      {selectedCreator.login_email || "미발급"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Total views
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedCreator.total_views.toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Subscribers gained
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedCreator.subscribers_gained.toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
                {selectedCreator.channel_concept && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {selectedCreator.channel_concept}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void onOpenWorkspace(`/workspace/${selectedCreator.id}`)
                      }
                      className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                    >
                      워크스페이스 이동
                    </button>
                  {selectedCreator.channel_url && (
                    <a
                      href={selectedCreator.channel_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                    >
                      Channel
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
            {selectedCreator && !hasIssuedAccount(selectedCreator) ? (
              <form
                onSubmit={form.handleSubmit(handleIssueAccount)}
                className="space-y-4"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Selected creator
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedCreator.name} ({selectedCreator.id})
                  </p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Login email
                  </label>
                  <input
                    className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
                    placeholder="creator@example.com"
                    {...form.register("loginEmail")}
                  />
                  {form.formState.errors.loginEmail && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.loginEmail.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Temporary password
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="w-full bg-muted px-4 py-3 text-sm outline-none"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        form.setValue("password", generateTempPassword(), {
                          shouldValidate: true
                        })
                      }
                      className="shrink-0 rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                    >
                      Generate
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "생성 중..." : "계정 생성"}
                </button>
              </form>
            ) : selectedCreator ? (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Account status
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  이미 계정이 생성된 크리에이터입니다.
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  기존 계정을 유지한 채 워크스페이스에 바로 이동할 수 있습니다.
                  아래 목록에서 임시 비밀번호 재설정도 가능합니다.
                </p>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">
                    Current login
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-emerald-900">
                    {selectedCreator.login_email}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {notice && <p className="mt-4 text-sm text-emerald-600">{notice}</p>}

        {createdCredential && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">
              Latest issued credential
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs text-emerald-700/70">Creator ID</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {createdCredential.creatorId}
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-700/70">Login email</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {createdCredential.loginEmail}
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-700/70">Temporary password</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {createdCredential.password}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-8 boty-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Issued accounts
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              워크스페이스 접속 가능 계정
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            발급 완료 {issuedCreators.length}명 / 미발급 {pendingCreators.length}명
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {issuedCreators.map((creator) => (
            <article
              key={creator.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {creator.id}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-foreground">
                    {creator.name}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {creator.channel_name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCreator(creator.id)}
                    className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                  >
                    계정관리
                  </button>
                  <button
                    type="button"
                    onClick={() => void onOpenWorkspace(`/workspace/${creator.id}`)}
                    className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                  >
                    워크스페이스 이동
                  </button>
                  {creator.channel_url && (
                    <a
                      href={creator.channel_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                    >
                      Channel
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Login email
                  </p>
                  <p className="mt-2 break-all text-sm text-foreground">
                    {creator.login_email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Join date
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {creator.join_date}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Metrics
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    Views {creator.total_views.toLocaleString("ko-KR")} / Subs{" "}
                    {creator.subscribers_gained.toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  type="text"
                  value={resetPasswords[creator.id] || ""}
                  onChange={(event) =>
                    setResetPasswords((prev) => ({
                      ...prev,
                      [creator.id]: event.target.value
                    }))
                  }
                  placeholder="새 임시 비밀번호"
                  className="w-full bg-muted px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleResetPassword(creator.id)}
                  disabled={resettingCreatorId === creator.id}
                  className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resettingCreatorId === creator.id
                    ? "변경 중..."
                    : "비밀번호 재설정"}
                </button>
              </div>
            </article>
          ))}

          {issuedCreators.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 px-5 py-10 text-center text-sm text-muted-foreground">
              아직 워크스페이스 접속 가능한 계정이 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
