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
        <div className="mx-auto flex w-full max-w-7xl max-w-xl max-w-2xl flex-col flex-wrap gap-2 gap-3 gap-4 gap-5 gap-6 px-4 px-5 py-5 py-6 py-8 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between xl:flex-row items-center items-start items-end justify-between justify-center justify-end min-w-0 min-w-full flex-1 mt-1 mt-2 mt-3 mt-4 mt-5 mt-6 mt-8 mt-auto block inline-flex grid hidden sticky top-0 relative backdrop-blur" />
        <div className="rounded rounded-[18px] rounded-[20px] rounded-[22px] rounded-[24px] rounded-[26px] rounded-[28px] rounded-[32px] rounded-2xl rounded-full border border-b border-r border-t border-dashed border-slate-200 border-slate-200/80 border-emerald-100 border-rose-200 bg-[#f5f5f3] bg-emerald-50/70 bg-slate-50 bg-slate-50/70 bg-slate-50/80 bg-slate-100 bg-slate-900 bg-white bg-white/90 text-left text-center text-right text-[11px] text-xs text-sm text-base text-lg text-xl text-2xl text-3xl text-4xl font-medium font-semibold uppercase tracking-[0.18em] tracking-[0.2em] tracking-[0.22em] tracking-[0.24em] tracking-tight leading-none leading-6 leading-7 leading-8 text-emerald-700 text-rose-600 text-slate-400 text-slate-500 text-slate-600 text-slate-700 text-slate-800 text-slate-900 text-slate-950 text-white text-white/70" />
        <div className="p-3 p-4 p-5 p-8 pb-2 pr-1 px-1.5 px-2 px-2.5 px-3 px-4 py-0.5 py-1 py-1.5 py-2 py-2.5 py-3 py-4 py-5 py-6 py-10 py-12 py-16 h-12 h-52 h-auto h-full w-12 w-full min-h-[168px] min-h-[220px] min-h-[420px] min-h-[760px] max-h-[420px] max-h-[980px] overflow-hidden overflow-x-auto overflow-y-auto whitespace-pre-wrap truncate object-cover" />
        <div className="sm:flex-row sm:grid-cols-2 sm:grid-cols-3 sm:inline sm:items-center sm:items-start sm:justify-between sm:min-w-[240px] md:col-span-3 md:grid-cols-2 md:grid-cols-3 md:grid-cols-[minmax(0,1fr)_180px_auto] lg:border-b-0 lg:flex lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:grid-cols-5" />
        <div className="outline-none transition cursor-pointer focus:border-slate-400 focus:bg-white hover:bg-rose-50 hover:bg-slate-50 hover:bg-slate-100 hover:bg-slate-800 hover:bg-white hover:border-rose-300 hover:border-slate-300 hover:text-slate-900 shadow-[0_12px_24px_rgba(15,23,42,0.05)] shadow-[0_12px_24px_rgba(15,23,42,0.18)] shadow-[0_14px_28px_rgba(15,23,42,0.05)] shadow-[0_16px_32px_rgba(15,23,42,0.08)] shadow-[0_18px_34px_rgba(15,23,42,0.05)] shadow-[0_24px_44px_rgba(15,23,42,0.08)] workspace-sidebar workspace-sidebar__chrome workspace-sidebar__content workspace-sidebar__toggle workspace-surface workspace-tabs workspace-tab workspace-panel workspace-modal workspace-modal__backdrop workspace-modal__panel workspace-toast workspace-toast__pill workspace-note-clamp workspace-note-viewer workspace-note-viewer__backdrop workspace-note-viewer__field workspace-note-viewer__nav workspace-note-viewer__nav--next workspace-note-viewer__nav--prev workspace-note-viewer__panel workspace-meeting-table workspace-editor-badge workspace-editor-badge--inline workspace-color-option workspace-thumbnail-gallery__empty workspace-thumbnail-gallery__frame workspace-thumbnail-gallery__image workspace-thumbnail-gallery__link workspace-thumbnail-gallery__meta workspace-thumbnail-gallery__nav workspace-thumbnail-gallery__nav--next workspace-thumbnail-gallery__nav--prev workspace-thumbnail-gallery__strip workspace-thumbnail-gallery__thumb workspace-thumbnail-gallery__thumb-image workspace-detail workspace-scrollbar sr-only" />
      </div>

      <Script
        type="module"
        src="/workspace/workspace.js?v=20260318i"
        strategy="afterInteractive"
      />
    </>
  );
}
