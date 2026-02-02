"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createSupabaseBrowser } from "@/lib/supabase/client"

const loginSchema = z.object({
  email: z.string().email("이메일 형식을 확인해 주세요."),
  password: z.string().min(6, "비밀번호를 6자 이상 입력해 주세요.")
})

type LoginValues = z.infer<typeof loginSchema>

export default function AdminLogin() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  })

  const onSubmit = async (values: LoginValues) => {
    setMessage(null)
    const supabase = createSupabaseBrowser()
    const { error } = await supabase.auth.signInWithPassword(values)

    if (error) {
      setMessage("로그인에 실패했습니다. 관리자 계정을 확인해 주세요.")
      return
    }

    router.push("/admin/dashboard")
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground boty-transition hover:bg-muted"
          >
            뒤로가기
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
          관리자 로그인
        </h1>

        <div className="mt-8 space-y-4">
          <div>
            <input
              type="email"
              placeholder="관리자 이메일"
              className="w-full bg-muted px-4 py-3 text-sm outline-none"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="비밀번호"
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
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        )}

          <button
            type="submit"
            className="mt-6 w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.25em] text-primary-foreground"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  )
}
