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
      <Script
        src="https://identity.netlify.com/v1/netlify-identity-widget.js"
        strategy="afterInteractive"
      />

      <div id="workspace-app" className="min-h-screen">
        <section id="auth-gate" className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="workspace-surface w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_44px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Creator Incubation Workspace
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Private planning board for creators and the company team.
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-500" data-auth-note>
              Sign in with your Netlify Identity account to enter your private workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                data-open-identity
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Log in with Netlify Identity
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Back to site
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

      <Script type="module" src="/workspace/workspace.js" strategy="afterInteractive" />
    </>
  );
}
