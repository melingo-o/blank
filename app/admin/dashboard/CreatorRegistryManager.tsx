"use client"

import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import type { CreatorWorkspaceAccount } from "@/lib/supabase/types"

const creatorProfileSchema = z.object({
  creatorId: z
    .string()
    .min(2, "크리에이터 ID는 2자 이상이어야 합니다.")
    .regex(/^[a-z0-9-]+$/, "영문 소문자, 숫자, 하이픈만 사용할 수 있습니다."),
  name: z.string().min(1, "크리에이터 이름을 입력하세요."),
  channelName: z.string().min(1, "채널명을 입력하세요."),
  channelConcept: z.string().optional(),
  joinDate: z.string().min(1, "계약일을 선택하세요."),
  channelUrl: z.string().url("올바른 채널 URL을 입력하세요.").or(z.literal("")),
  totalViews: z.coerce.number().min(0, "누적 조회수는 0 이상이어야 합니다."),
  subscribersGained: z.coerce.number().min(0, "구독자 증감은 0 이상이어야 합니다.")
})

type CreatorProfileValues = z.infer<typeof creatorProfileSchema>

type AdminCreatorApiCaller = (options?: {
  method?: "GET" | "POST"
  body?: Record<string, unknown>
}) => Promise<{
  ok?: boolean
  creator?: CreatorWorkspaceAccount
}>

type CreatorRegistryManagerProps = {
  creators: CreatorWorkspaceAccount[]
  callAdminCreatorApi: AdminCreatorApiCaller
  onRequestAccountSetup: (creatorId: string) => void
  onCreatorsChanged: (preferredCreatorId?: string | null) => Promise<void> | void
}

function slugifyCreatorId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

function hasIssuedAccount(creator: CreatorWorkspaceAccount) {
  return Boolean(creator.auth_user_id || creator.login_email)
}

function defaultValues(): CreatorProfileValues {
  return {
    creatorId: "",
    name: "",
    channelName: "",
    channelConcept: "",
    joinDate: new Date().toISOString().slice(0, 10),
    channelUrl: "",
    totalViews: 0,
    subscribersGained: 0
  }
}

export default function CreatorRegistryManager({
  creators,
  callAdminCreatorApi,
  onRequestAccountSetup,
  onCreatorsChanged
}: CreatorRegistryManagerProps) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const form = useForm<CreatorProfileValues>({
    resolver: zodResolver(creatorProfileSchema),
    defaultValues: defaultValues()
  })

  const handleGenerateCreatorId = () => {
    const name = form.getValues("name")
    const channelName = form.getValues("channelName")
    const nextId = slugifyCreatorId(name || channelName)

    if (!nextId) {
      setError("이름이나 채널명을 먼저 입력하세요.")
      return
    }

    form.setValue("creatorId", nextId, { shouldValidate: true })
    setError(null)
  }

  const handleCreateCreatorProfile = async (values: CreatorProfileValues) => {
    setError(null)
    setNotice(null)

    try {
      const payload = await callAdminCreatorApi({
        method: "POST",
        body: {
          action: "createCreatorProfile",
          payload: values
        }
      })

      setNotice(`${payload.creator?.name || values.name} 크리에이터 정보를 등록했습니다.`)
      form.reset(defaultValues())
      await onCreatorsChanged(payload.creator?.id || values.creatorId)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "크리에이터 정보를 등록하지 못했습니다."
      )
    }
  }

  return (
    <section className="mt-10 space-y-8">
      <div className="rounded-3xl border border-border/60 bg-card p-8 boty-shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Creator Registry
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              계약 크리에이터 등록
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              우리와 계약한 크리에이터를 먼저 등록한 뒤, 목록에서 바로 계정생성
              탭으로 이동해 워크스페이스 계정을 발급할 수 있습니다.
            </p>
          </div>
        </div>

        <form
          onSubmit={form.handleSubmit(handleCreateCreatorProfile)}
          className="mt-8 grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Creator name
            </label>
            <input
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
              placeholder="채희"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Channel name
            </label>
            <input
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
              placeholder="채희의 하루"
              {...form.register("channelName")}
            />
            {form.formState.errors.channelName && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.channelName.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Creator ID
            </label>
            <div className="mt-2 flex gap-2">
              <input
                className="w-full bg-muted px-4 py-3 text-sm outline-none"
                placeholder="chaehee"
                {...form.register("creatorId")}
              />
              <button
                type="button"
                onClick={handleGenerateCreatorId}
                className="shrink-0 rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
              >
                Generate
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              이 ID는 로그인 ID와 워크스페이스 주소로 그대로 사용됩니다.
            </p>
            {form.formState.errors.creatorId && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.creatorId.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Join date
            </label>
            <input
              type="date"
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
              {...form.register("joinDate")}
            />
            {form.formState.errors.joinDate && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.joinDate.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Channel URL
            </label>
            <input
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
              placeholder="https://youtube.com/@creator"
              {...form.register("channelUrl")}
            />
            {form.formState.errors.channelUrl && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.channelUrl.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Total views
            </label>
            <input
              type="number"
              min={0}
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
              {...form.register("totalViews")}
            />
            {form.formState.errors.totalViews && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.totalViews.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Subscribers gained
            </label>
            <input
              type="number"
              min={0}
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
              {...form.register("subscribersGained")}
            />
            {form.formState.errors.subscribersGained && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.subscribersGained.message}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Channel concept
            </label>
            <textarea
              rows={4}
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
              placeholder="채널 포지셔닝과 운영 방향을 간단히 적어두세요."
              {...form.register("channelConcept")}
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-between gap-4">
            <div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {notice && <p className="text-sm text-emerald-600">{notice}</p>}
            </div>
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "등록 중..." : "크리에이터 등록"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-8 boty-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Creator List
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              우리 크리에이터 목록
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            등록된 크리에이터 {creators.length}명
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {creators.map((creator) => {
            const issued = hasIssuedAccount(creator)

            return (
              <article
                key={creator.id}
                className="rounded-2xl border border-border/60 bg-background/70 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {creator.id}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
                          issued
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {issued ? "계정생성 완료" : "계정 미발급"}
                      </span>
                    </div>
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
                      onClick={() => onRequestAccountSetup(creator.id)}
                      className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                    >
                      {issued ? "계정관리" : "계정생성"}
                    </button>
                    {issued && (
                      <Link
                        href={`/workspace/${creator.id}`}
                        className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                      >
                        워크스페이스 이동
                      </Link>
                    )}
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

                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Login email
                    </p>
                    <p className="mt-2 break-all text-sm text-foreground">
                      {creator.login_email || "미발급"}
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
                      Total views
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {creator.total_views.toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Subscribers gained
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {creator.subscribers_gained.toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>

                {creator.channel_concept && (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {creator.channel_concept}
                  </p>
                )}
              </article>
            )
          })}

          {creators.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 px-5 py-10 text-center text-sm text-muted-foreground">
              아직 등록된 크리에이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
