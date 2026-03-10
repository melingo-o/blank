"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { createSupabaseBrowser } from "@/lib/supabase/client"

const WORKSPACE_SESSION_HANDOFF_KEY = "workspaceSessionHandoff"

type CreatorWorkspaceModalProps = {
  buttonClassName: string
  buttonLabel?: string
}

export function CreatorWorkspaceModal({
  buttonClassName,
  buttonLabel = "Creator Workspace"
}: CreatorWorkspaceModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    const scrollbarCompensation = Math.max(
      window.innerWidth - document.documentElement.clientWidth,
      0
    )

    document.documentElement.style.setProperty(
      "--creator-workspace-scrollbar-compensation",
      `${scrollbarCompensation}px`
    )
    document.body.classList.add("creator-workspace-modal-open")

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.classList.remove("creator-workspace-modal-open")
      document.documentElement.style.removeProperty(
        "--creator-workspace-scrollbar-compensation"
      )
    }
  }, [isOpen])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/.netlify/functions/workspace-password-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          loginId,
          password,
          mode: "workspace"
        })
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "Unable to sign in.")
      }

      const supabase = createSupabaseBrowser()
      const { error } = await supabase.auth.setSession({
        access_token: payload.accessToken,
        refresh_token: payload.refreshToken
      })

      if (error) {
        throw error
      }

      window.sessionStorage.setItem(
        WORKSPACE_SESSION_HANDOFF_KEY,
        JSON.stringify({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          expiresAt: payload.expiresAt,
          creatorId: payload.creatorId,
          redirectTo: payload.redirectTo
        })
      )

      setIsOpen(false)
      setLoginId("")
      setPassword("")
      router.push(payload.redirectTo || "/workspace")
      router.refresh()
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Unable to sign in."
      setMessage(nextMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div
          className="creator-workspace-modal fixed inset-0 z-[70] flex items-center justify-center px-4 py-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false)
            }
          }}
        >
          <div className="creator-workspace-modal__panel w-full max-w-[520px] rounded-[32px] border border-white/70 bg-white/95 p-8 text-slate-900 shadow-[0_28px_72px_rgba(15,17,23,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  크리에이터 워크스페이스
                </p>
                <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight text-slate-950">
                  워크스페이스에서 창작영감을 얻으세요
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  발급받은 아이디와 비밀번호를 입력해 주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close creator workspace login"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4">
                <label
                  htmlFor="creator-workspace-login-id"
                  className="text-sm font-semibold tracking-[0.22em] text-slate-500"
                >
                  ID
                </label>
                <input
                  id="creator-workspace-login-id"
                  type="text"
                  autoComplete="username"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  placeholder="chaehee"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>
              <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4">
                <label
                  htmlFor="creator-workspace-password"
                  className="text-sm font-semibold tracking-[0.22em] text-slate-500"
                >
                  PW
                </label>
                <input
                  id="creator-workspace-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>

              {message && <p className="text-sm text-rose-600">{message}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "로그인 중..." : "워크스페이스 열기"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
