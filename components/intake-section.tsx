"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSupabaseBrowser } from "@/lib/supabase/client"

type FormType = "apply" | "business" | null

const applySchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  phone: z.string().min(1, "연락처를 입력해 주세요."),
  sns: z.string().min(1, "SNS 링크를 입력해 주세요."),
  intro: z.string().min(10, "간단한 소개를 10자 이상 입력해 주세요.")
})

const businessSchema = z.object({
  company: z.string().min(1, "회사/브랜드명을 입력해 주세요."),
  contact: z.string().min(1, "담당자 연락처를 입력해 주세요."),
  budget: z.string().min(1, "예산 범위를 선택해 주세요."),
  details: z.string().min(10, "제안 내용을 10자 이상 입력해 주세요.")
})

type ApplyValues = z.infer<typeof applySchema>
type BusinessValues = z.infer<typeof businessSchema>

export function IntakeSection() {
  const [openForm, setOpenForm] = useState<FormType>(null)
  const [activeForm, setActiveForm] = useState<Exclude<FormType, null> | null>(
    null
  )
  const [applyMessage, setApplyMessage] = useState<string | null>(null)
  const [businessMessage, setBusinessMessage] = useState<string | null>(null)
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = useMemo(
    () => (hasSupabase ? createSupabaseBrowser() : null),
    [hasSupabase]
  )

  const applyForm = useForm<ApplyValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      name: "",
      phone: "",
      sns: "",
      intro: ""
    }
  })

  const businessForm = useForm<BusinessValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      company: "",
      contact: "",
      budget: "",
      details: ""
    }
  })

  const toggleForm = (type: Exclude<FormType, null>) => {
    setApplyMessage(null)
    setBusinessMessage(null)
    setActiveForm(type)
    setOpenForm((current) => (current === type ? null : type))
  }

  const onSubmitApply = async (values: ApplyValues) => {
    setApplyMessage(null)
    if (!supabase) {
      setApplyMessage("Supabase 환경변수가 설정되어 있지 않습니다.")
      return
    }

    const { error } = await supabase.from("submissions").insert({
      type: "apply",
      name: values.name,
      phone: values.phone,
      sns: values.sns,
      intro: values.intro
    })

    if (error) {
      setApplyMessage("전송에 실패했습니다. 잠시 후 다시 시도해 주세요.")
      return
    }

    applyForm.reset()
    setApplyMessage("지원서가 정상적으로 접수되었습니다.")
  }

  const onSubmitBusiness = async (values: BusinessValues) => {
    setBusinessMessage(null)
    if (!supabase) {
      setBusinessMessage("Supabase 환경변수가 설정되어 있지 않습니다.")
      return
    }

    const { error } = await supabase.from("submissions").insert({
      type: "business",
      company: values.company,
      contact: values.contact,
      budget: values.budget,
      details: values.details
    })

    if (error) {
      setBusinessMessage("전송에 실패했습니다. 잠시 후 다시 시도해 주세요.")
      return
    }

    businessForm.reset()
    setBusinessMessage("제안이 정상적으로 접수되었습니다.")
  }

  return (
    <section
      id="contact"
      className="relative scroll-mt-28 overflow-hidden bg-background pt-32 pb-24"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,204,182,0.35),_rgba(255,255,255,0)_65%)] md:h-[360px] md:w-[360px]" />
      <div className="relative mx-auto w-full max-w-3xl px-6 lg:px-8 text-center text-foreground">
        <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
          Contact
        </p>
        <h2 className="mt-4 font-serif text-4xl text-foreground md:text-5xl">
          Apply / Business
        </h2>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => toggleForm("apply")}
            aria-expanded={openForm === "apply"}
            className={`px-10 py-4 text-xs uppercase tracking-[0.3em] transition ${
              openForm === "apply"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground"
            }`}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => toggleForm("business")}
            aria-expanded={openForm === "business"}
            className={`px-10 py-4 text-xs uppercase tracking-[0.3em] transition ${
              openForm === "business"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground"
            }`}
          >
            Business
          </button>
        </div>

        <div
          className={`transition-[max-height,opacity,transform] duration-500 ease-out overflow-hidden ${
            openForm
              ? "mt-12 max-h-[1200px] opacity-100 translate-y-0"
              : "mt-0 max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
          aria-hidden={!openForm}
        >
          {activeForm === "apply" && (
            <form
              onSubmit={applyForm.handleSubmit(onSubmitApply)}
              className="mx-auto w-full max-w-3xl bg-card p-10 text-left text-foreground boty-shadow"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                For Creator (APPLY)
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                당신의 가능성을 함께 실현할 팀을 찾고 있나요?
              </p>
              <div className="mt-6 flex items-center justify-between">
                <h3 className="text-2xl font-semibold">MUSE Application</h3>
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Apply
                </span>
              </div>
              <div className="mt-4 h-px w-full bg-border" />

              <div className="mt-6 space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="이름 (Name)"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...applyForm.register("name")}
                  />
                  {applyForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-destructive">
                      {applyForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="연락처 (010-0000-0000)"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...applyForm.register("phone")}
                  />
                  {applyForm.formState.errors.phone && (
                    <p className="mt-1 text-xs text-destructive">
                      {applyForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="SNS 링크 (Insta / YouTube)"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...applyForm.register("sns")}
                  />
                  {applyForm.formState.errors.sns && (
                    <p className="mt-1 text-xs text-destructive">
                      {applyForm.formState.errors.sns.message}
                    </p>
                  )}
                </div>
                <div>
                  <textarea
                    rows={4}
                    placeholder="간단한 자기소개를 남겨주세요"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...applyForm.register("intro")}
                  />
                  {applyForm.formState.errors.intro && (
                    <p className="mt-1 text-xs text-destructive">
                      {applyForm.formState.errors.intro.message}
                    </p>
                  )}
                </div>
              </div>

              {applyMessage && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {applyMessage}
                </p>
              )}

              <button
                type="submit"
                className="mt-6 w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.25em] text-primary-foreground"
                disabled={applyForm.formState.isSubmitting}
              >
                {applyForm.formState.isSubmitting
                  ? "전송 중..."
                  : "지원서 제출하기"}
              </button>
            </form>
          )}

          {activeForm === "business" && (
            <form
              onSubmit={businessForm.handleSubmit(onSubmitBusiness)}
              className="mx-auto w-full max-w-3xl bg-card p-10 text-left text-foreground boty-shadow"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                For Brand (BUSINESS)
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                가장 트렌디한 인플루언서와 강력한 캠페인을 준비 중이신가요?
              </p>
              <div className="mt-6 flex items-center justify-between">
                <h3 className="text-2xl font-semibold">Business Partnership</h3>
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Business
                </span>
              </div>
              <div className="mt-4 h-px w-full bg-border" />

              <div className="mt-6 space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="회사/브랜드명"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...businessForm.register("company")}
                  />
                  {businessForm.formState.errors.company && (
                    <p className="mt-1 text-xs text-destructive">
                      {businessForm.formState.errors.company.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="담당자 연락처"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...businessForm.register("contact")}
                  />
                  {businessForm.formState.errors.contact && (
                    <p className="mt-1 text-xs text-destructive">
                      {businessForm.formState.errors.contact.message}
                    </p>
                  )}
                </div>
                <div>
                  <select
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...businessForm.register("budget")}
                  >
                    <option value="">예산 범위 (선택)</option>
                    <option value="300만원 이하">300만원 이하</option>
                    <option value="300만원 - 1,000만원">
                      300만원 - 1,000만원
                    </option>
                    <option value="1,000만원 - 3,000만원">
                      1,000만원 - 3,000만원
                    </option>
                    <option value="3,000만원 이상">3,000만원 이상</option>
                  </select>
                  {businessForm.formState.errors.budget && (
                    <p className="mt-1 text-xs text-destructive">
                      {businessForm.formState.errors.budget.message}
                    </p>
                  )}
                </div>
                <div>
                  <textarea
                    rows={4}
                    placeholder="제안 내용"
                    className="w-full bg-muted px-4 py-3 text-sm outline-none"
                    {...businessForm.register("details")}
                  />
                  {businessForm.formState.errors.details && (
                    <p className="mt-1 text-xs text-destructive">
                      {businessForm.formState.errors.details.message}
                    </p>
                  )}
                </div>
              </div>

              {businessMessage && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {businessMessage}
                </p>
              )}

              <button
                type="submit"
                className="mt-6 w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.25em] text-primary-foreground"
                disabled={businessForm.formState.isSubmitting}
              >
                {businessForm.formState.isSubmitting
                  ? "전송 중..."
                  : "제안서 제출하기"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
