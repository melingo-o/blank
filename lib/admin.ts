import { redirect } from "next/navigation"
import { createSupabaseServer } from "@/lib/supabase/server"

export const requireAdmin = async () => {
  const supabase = await createSupabaseServer()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin")
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!admin) {
    redirect("/admin")
  }

  return { supabase, user }
}
