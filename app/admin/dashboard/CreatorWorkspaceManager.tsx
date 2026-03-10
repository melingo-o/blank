"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSupabaseBrowser } from "@/lib/supabase/client"
import type { CreatorWorkspaceAccount } from "@/lib/supabase/types"

const createCreatorSchema = z.object({
  creatorId: z
    .string()
    .min(2, "Creator ID must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  name: z.string().min(1, "Enter the creator name."),
  channelName: z.string().min(1, "Enter the channel name."),
  channelConcept: z.string().optional(),
  joinDate: z.string().min(1, "Select the join date."),
  channelUrl: z.string().url("Enter a valid channel URL.").or(z.literal("")),
  loginEmail: z.string().email("Enter a valid login email."),
  password: z.string().min(8, "Use at least 8 characters for the password.")
})

type CreateCreatorValues = z.infer<typeof createCreatorSchema>

type CreatorWorkspaceManagerProps = {
  initialCreators: CreatorWorkspaceAccount[]
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

function generateTempPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*"

  return Array.from({ length: 12 }, () => {
    const index = Math.floor(Math.random() * alphabet.length)
    return alphabet[index]
  }).join("")
}

export default function CreatorWorkspaceManager({
  initialCreators
}: CreatorWorkspaceManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowser(), [])
  const [creators, setCreators] = useState<CreatorWorkspaceAccount[]>(
    initialCreators
  )
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})
  const [resettingCreatorId, setResettingCreatorId] = useState<string | null>(null)
  const [createdCredential, setCreatedCredential] = useState<{
    creatorId: string
    loginEmail: string
    password: string
  } | null>(null)

  const form = useForm<CreateCreatorValues>({
    resolver: zodResolver(createCreatorSchema),
    defaultValues: {
      creatorId: "",
      name: "",
      channelName: "",
      channelConcept: "",
      joinDate: new Date().toISOString().slice(0, 10),
      channelUrl: "",
      loginEmail: "",
      password: generateTempPassword()
    }
  })

  const callAdminCreatorApi = useCallback(
    async (options?: { method?: "GET" | "POST"; body?: Record<string, unknown> }) => {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("Admin session expired. Sign in again.")
      }

      const response = await fetch("/.netlify/functions/workspace-admin-creators", {
        method: options?.method || "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: options?.body ? JSON.stringify(options.body) : undefined
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "Request failed.")
      }

      return payload
    },
    [supabase]
  )

  const refreshCreators = useCallback(async () => {
    try {
      const payload = await callAdminCreatorApi()
      setCreators(payload.creators || [])
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load creators."
      )
    }
  }, [callAdminCreatorApi])

  useEffect(() => {
    setResetPasswords((prev) => {
      const nextDrafts: Record<string, string> = {}
      creators.forEach((creator) => {
        nextDrafts[creator.id] = prev[creator.id] || ""
      })
      return nextDrafts
    })
  }, [creators])

  const handleGenerateCreatorId = () => {
    const name = form.getValues("name")
    const channelName = form.getValues("channelName")
    const fallback = name || channelName
    const nextId = slugifyCreatorId(fallback)

    if (!nextId) {
      setError("Enter a creator or channel name first.")
      return
    }

    form.setValue("creatorId", nextId, { shouldValidate: true })
    setError(null)
  }

  const handleGeneratePassword = () => {
    form.setValue("password", generateTempPassword(), { shouldValidate: true })
  }

  const handleCreateCreator = async (values: CreateCreatorValues) => {
    setError(null)
    setNotice(null)

    try {
      const payload = await callAdminCreatorApi({
        method: "POST",
        body: {
          action: "createCreator",
          payload: values
        }
      })

      setCreatedCredential({
        creatorId: payload.creator.id,
        loginEmail: payload.creator.login_email,
        password: values.password
      })
      setNotice("Creator workspace account created.")
      form.reset({
        creatorId: "",
        name: "",
        channelName: "",
        channelConcept: "",
        joinDate: new Date().toISOString().slice(0, 10),
        channelUrl: "",
        loginEmail: "",
        password: generateTempPassword()
      })
      await refreshCreators()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to create the creator."
      )
    }
  }

  const handleResetPassword = async (creatorId: string) => {
    const password = resetPasswords[creatorId]?.trim()

    if (!password || password.length < 8) {
      setError("Use at least 8 characters for the new password.")
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

      setNotice(`Password updated for ${creatorId}.`)
      setResetPasswords((prev) => ({
        ...prev,
        [creatorId]: ""
      }))
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to reset the password."
      )
    } finally {
      setResettingCreatorId(null)
    }
  }

  return (
    <section className="mt-10 space-y-8">
      <div className="rounded-3xl border border-border/60 bg-card p-8 boty-shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Creator Workspace Accounts
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              Issue creator IDs and passwords
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create the workspace login ID, the linked Supabase Auth account,
              and the creator record in one step.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshCreators}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
          >
            Refresh
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit(handleCreateCreator)}
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
              placeholder="ADHD Life"
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
              Creator login ID
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
            {form.formState.errors.creatorId && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.creatorId.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Login email
            </label>
            <input
              className="mt-2 w-full bg-muted px-4 py-3 text-sm outline-none"
              placeholder="chaehee@example.com"
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
              placeholder="https://youtube.com/@adhdlife"
              {...form.register("channelUrl")}
            />
            {form.formState.errors.channelUrl && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.channelUrl.message}
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
              placeholder="Short positioning and content direction"
              {...form.register("channelConcept")}
            />
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
                onClick={handleGeneratePassword}
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
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Creating..."
                : "Create creator account"}
            </button>
          </div>
        </form>

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
              Creator workspace list
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {creators.length} creator workspace account(s)
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {creators.map((creator) => (
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
                  <Link
                    href={`/workspace/${creator.id}`}
                    className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
                  >
                    Open workspace
                  </Link>
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
                  placeholder="New temporary password"
                  className="w-full bg-muted px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleResetPassword(creator.id)}
                  disabled={resettingCreatorId === creator.id}
                  className="rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resettingCreatorId === creator.id
                    ? "Updating..."
                    : "Reset password"}
                </button>
              </div>
            </article>
          ))}

          {creators.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 px-5 py-10 text-center text-sm text-muted-foreground">
              No creator workspace account has been issued yet.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
