"use client"

import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const forgotPasswordSchema = z.object({
  loginId: z.string().min(1, "비밀번호를 찾을 아이디를 입력해주세요.")
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

type ForgotPasswordFormProps = {
  initialLoginId: string
}

export default function ForgotPasswordForm({
  initialLoginId
}: ForgotPasswordFormProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      loginId: initialLoginId
    }
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setMessage(null)
    setNotice(null)

    const response = await fetch("/.netlify/functions/workspace-password-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        loginId: values.loginId,
        mode: "admin",
        redirectTo: `${window.location.origin}/admin/reset-password`
      })
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(payload.error || "비밀번호 재설정 메일을 보낼 수 없습니다.")
      return
    }

    setNotice(
      payload.message ||
        `등록된 관리자 이메일${payload.emailHint ? ` (${payload.emailHint})` : ""}로 재설정 메일을 보냈습니다.`
    )
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
          Password recovery
        </p>
        <h1 className="mt-4 font-serif text-3xl text-foreground">
          비밀번호 찾기
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          비밀번호를 찾을 관리자 아이디를 입력하면 등록된 관리자 이메일로 재설정 링크를 보냅니다.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div>
            <input
              type="text"
              placeholder="관리자 아이디"
              className="w-full bg-muted px-4 py-3 text-sm outline-none"
              {...form.register("loginId")}
            />
            {form.formState.errors.loginId && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.loginId.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.25em] text-primary-foreground"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Sending..."
              : "재설정 메일 보내기"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm leading-6 text-destructive">{message}</p>
        )}
        {notice && (
          <p className="mt-4 text-sm leading-6 text-foreground">{notice}</p>
        )}

        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
          <p>
            메일 요청을 너무 자주 보내면 잠시 동안 제한될 수 있습니다. 그 경우 잠시 후 다시 시도하세요.
          </p>
          <p className="mt-2">
            급하게 접속해야 하면 Supabase Dashboard의 <span className="font-medium text-foreground">Authentication &gt; Users</span>에서
            관리자 계정을 직접 찾아 비밀번호를 재설정하는 방법이 더 빠릅니다.
          </p>
        </div>
      </div>
    </div>
  )
}
