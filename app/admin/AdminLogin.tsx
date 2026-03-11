"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createSupabaseBrowser } from "@/lib/supabase/client"

const loginSchema = z.object({
  loginId: z.string().min(1, "Enter your admin ID."),
  password: z.string().min(6, "Password must be at least 6 characters.")
})

type LoginValues = z.infer<typeof loginSchema>

export default function AdminLogin() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginId: "",
      password: ""
    }
  })

  const onSubmit = async (values: LoginValues) => {
    setMessage(null)

    const response = await fetch("/.netlify/functions/workspace-password-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        loginId: values.loginId,
        password: values.password,
        mode: "admin"
      })
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(payload.error || "Admin sign-in failed. Check the issued ID.")
      return
    }

    const supabase = createSupabaseBrowser()
    const { error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken
    })

    if (error) {
      setMessage(error.message || "Admin sign-in failed.")
      return
    }

    router.push(payload.redirectTo || "/admin/dashboard")
    router.refresh()
  }

  const onMoveToForgotPassword = () => {
    const loginId = form.getValues("loginId").trim()
    const query = loginId ? `?loginId=${encodeURIComponent(loginId)}` : ""
    router.push(`/admin/forgot-password${query}`)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
          >
            Back to site
          </Link>
        </div>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full rounded-3xl border border-border/60 bg-card p-10 text-foreground boty-shadow"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-4 font-serif text-3xl text-foreground">
            Master workspace access
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sign in with the admin ID and password that were issued to you.
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <input
                type="text"
                placeholder="Admin ID"
                className="w-full bg-muted px-4 py-3 text-sm outline-none"
                {...form.register("loginId")}
              />
              {form.formState.errors.loginId && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.loginId.message}
                </p>
              )}
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-muted px-4 py-3 text-sm outline-none"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>

          {message && (
            <p className="mt-4 text-sm text-destructive">{message}</p>
          )}

          <button
            type="submit"
            className="mt-6 w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.25em] text-primary-foreground"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in..." : "Log in"}
          </button>
          <button
            type="button"
            className="mt-3 w-full border border-border/60 px-6 py-4 text-sm uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
            disabled={form.formState.isSubmitting}
            onClick={onMoveToForgotPassword}
          >
            비밀번호 찾기
          </button>
        </form>
      </div>
    </div>
  )
}
