"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { createSupabaseBrowser } from "@/lib/supabase/client"

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
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false)
            }
          }}
        >
          <div className="w-full max-w-md rounded-[32px] border border-white/20 bg-white p-8 text-slate-900 shadow-[0_32px_80px_rgba(15,17,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Creator Workspace
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  Log in to your private board
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Enter the ID and password that we issued to open your shared
                  workspace.
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
              <div>
                <label
                  htmlFor="creator-workspace-login-id"
                  className="block text-sm font-medium text-slate-700"
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
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="creator-workspace-password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="creator-workspace-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </div>

              {message && <p className="text-sm text-rose-600">{message}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Signing in..." : "Open workspace"}
              </button>
            </form>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              Admin access is available from the <span className="font-medium text-slate-700">Admin</span>{" "}
              link in the footer.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
