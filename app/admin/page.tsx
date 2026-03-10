import { redirect } from "next/navigation"
import AdminLogin from "./AdminLogin"
import { createSupabaseServer } from "@/lib/supabase/server"

export default async function AdminPage() {
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!hasSupabase) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
        <div className="rounded-3xl border border-border/60 bg-card p-10 text-center text-foreground boty-shadow">
          <h1 className="text-2xl font-semibold">Supabase setup required</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
            before using the admin console.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createSupabaseServer()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    const { data: admin } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (admin) {
      redirect("/admin/dashboard")
    }
  }

  return <AdminLogin />
}
