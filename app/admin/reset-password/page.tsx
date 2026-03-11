"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSupabaseBrowser } from "@/lib/supabase/client"

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your new password.")
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  })

type ResetValues = z.infer<typeof resetSchema>
type RecoveryState = "checking" | "ready" | "invalid"

export default function AdminResetPasswordPage() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking")
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  })

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    let isActive = true

    const initializeRecoverySession = async () => {
      const currentUrl = new URL(window.location.href)
      const code = currentUrl.searchParams.get("code")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          if (isActive) {
            setRecoveryState("invalid")
            setMessage(error.message || "This recovery link is invalid or expired.")
          }
          return
        }

        currentUrl.searchParams.delete("code")
        currentUrl.searchParams.delete("type")
        window.history.replaceState({}, "", currentUrl.pathname)

        if (isActive) {
          setRecoveryState("ready")
          setMessage(null)
        }
        return
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          if (isActive) {
            setRecoveryState("invalid")
            setMessage(error.message || "This recovery link is invalid or expired.")
          }
          return
        }

        window.history.replaceState({}, "", window.location.pathname)

        if (isActive) {
          setRecoveryState("ready")
          setMessage(null)
        }
        return
      }

      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!isActive) {
        return
      }

      if (session) {
        setRecoveryState("ready")
        return
      }

      setRecoveryState("invalid")
      setMessage("Open the recovery link from the email to set a new password.")
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) {
        return
      }

      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setRecoveryState("ready")
        setMessage(null)
      }
    })

    void initializeRecoverySession()

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (values: ResetValues) => {
    setMessage(null)
    setNotice(null)

    const supabase = createSupabaseBrowser()
    const { error } = await supabase.auth.updateUser({
      password: values.password
    })

    if (error) {
      setMessage(error.message || "Unable to update the password.")
      return
    }

    setNotice("Password updated. Redirecting to the admin dashboard...")
    router.push("/admin/dashboard")
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
      <div className="w-full rounded-3xl border border-border/60 bg-card p-10 text-foreground boty-shadow">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/admin"
            className="rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
          >
            Back to admin
          </Link>
        </div>

        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Admin recovery
        </p>
        <h1 className="mt-4 font-serif text-3xl text-foreground">
          Set a new admin password
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Open the reset link from your email, then enter the new password here.
        </p>

        {recoveryState === "checking" && (
          <p className="mt-8 text-sm text-muted-foreground">
            Checking the recovery link...
          </p>
        )}

        {recoveryState === "invalid" && (
          <p className="mt-8 text-sm text-destructive">
            {message || "This recovery link is invalid or expired."}
          </p>
        )}

        {recoveryState === "ready" && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <input
                type="password"
                placeholder="New password"
                className="w-full bg-muted px-4 py-3 text-sm outline-none"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full bg-muted px-4 py-3 text-sm outline-none"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {message && (
              <p className="text-sm text-destructive">{message}</p>
            )}
            {notice && (
              <p className="text-sm text-foreground">{notice}</p>
            )}

            <button
              type="submit"
              className="w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.25em] text-primary-foreground"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
