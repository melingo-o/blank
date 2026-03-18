import Link from "next/link";
import Script from "next/script";

export function WorkspaceShell() {
  return (
    <>
      <Script
        src="https://cdn.tailwindcss.com?plugins=forms,typography"
        strategy="beforeInteractive"
      />
      <Script id="workspace-tailwind-config" strategy="beforeInteractive">
        {`
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ["DM Sans", "Pretendard", "Noto Sans KR", "system-ui", "sans-serif"]
                }
              }
            }
          };
        `}
      </Script>

      <div id="workspace-app" className="min-h-screen">
        <section
          id="workspace-boot"
          className="flex min-h-screen items-center justify-center px-4 py-10"
        >
          <div className="workspace-surface w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_44px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              크리에이터 워크스페이스
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              워크스페이스를 준비하고 있습니다.
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              로그인 정보를 확인한 뒤 바로 워크스페이스를 불러옵니다.
            </p>
          </div>
        </section>

        <section
          id="auth-gate"
          className="hidden flex min-h-screen items-center justify-center px-4 py-10"
        >
          <div className="workspace-surface w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_44px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              크리에이터 워크스페이스
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              워크스페이스 로그인
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-500" data-auth-note>
              발급받은 아이디와 비밀번호를 입력해 주세요.
            </p>
            <form className="mt-8 space-y-4" data-workspace-auth-form>
              <div>
                <label
                  htmlFor="workspace-login-id"
                  className="block text-sm font-medium text-slate-700"
                >
                  ID
                </label>
                <input
                  id="workspace-login-id"
                  type="text"
                  autoComplete="username"
                  placeholder="chaehee"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="workspace-password"
                  className="block text-sm font-medium text-slate-700"
                >
                  PW
                </label>
                <input
                  id="workspace-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="비밀번호 입력"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                data-workspace-auth-submit
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                워크스페이스 열기
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                사이트로 돌아가기
              </Link>
            </div>
          </div>
        </section>

        <div id="workspace-layout" className="hidden min-h-screen lg:flex">
          <aside
            id="workspace-sidebar"
            className="workspace-sidebar border-b border-r border-slate-200/80 bg-[#f5f5f3] lg:border-b-0"
          />

          <main className="min-w-0 flex-1">
            <header
              id="workspace-header"
              className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur"
            />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
              <nav id="workspace-tabs" className="workspace-tabs" />
              <div id="workspace-notice" />

              <section id="panel-overview" data-panel="overview" className="workspace-panel" />
              <section
                id="panel-strategy"
                data-panel="strategy"
                className="workspace-panel"
                hidden
              />
              <section
                id="panel-meetings"
                data-panel="meetings"
                className="workspace-panel"
                hidden
              />
              <section
                id="panel-pipeline"
                data-panel="pipeline"
                className="workspace-panel"
                hidden
              />
              <section
                id="panel-feedback"
                data-panel="feedback"
                className="workspace-panel"
                hidden
              />
              <section
                id="panel-timeline"
                data-panel="timeline"
                className="workspace-panel"
                hidden
              />
            </div>
          </main>
        </div>

        <div id="workspace-modal" className="workspace-modal hidden" />
        <div id="workspace-toast" className="workspace-toast" />
      </div>

      <div hidden aria-hidden="true" data-workspace-tailwind-safelist>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between grid gap-2 sm:grid-cols-3 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 bg-slate-900 text-white hover:bg-slate-800 text-[11px] uppercase tracking-[0.24em] text-slate-500 mt-2 text-3xl tracking-tight text-slate-950 text-slate-400" />
        <div className="rounded-[24px] rounded-[22px] rounded-2xl border border-slate-200 border-t border-slate-200/80 bg-white bg-slate-50 p-3 p-4 px-2 py-1 px-2.5 py-1 px-3 py-2 px-3 py-3 px-4 py-4 shadow-[0_16px_32px_rgba(15,23,42,0.08)] shadow-[0_12px_24px_rgba(15,23,42,0.18)]" />
        <div className="space-y-5 space-y-1 mt-4 mt-3 mt-auto flex w-full min-w-0 items-start items-center justify-between gap-2 gap-3 text-left text-xs text-sm text-base font-medium leading-none leading-6 text-slate-400 text-slate-500 text-slate-600 text-slate-700 text-slate-900 text-white text-white/70 hover:text-slate-900 truncate" />
      </div>

      <Script
        type="module"
        src="/workspace/workspace.js?v=20260318h"
        strategy="afterInteractive"
      />
    </>
  );
}
