import AdminDashboard from "./AdminDashboard"
import { requireAdmin } from "@/lib/admin"

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin()

  const [
    { data: portfolioItems },
    { data: teamMembers },
    { data: submissions }
  ] = await Promise.all([
    supabase.from("portfolio_items").select("*").order("order_index", {
      ascending: true
    }),
    supabase.from("team_members").select("*").order("order_index", {
      ascending: true
    }),
    supabase.from("submissions").select("*").order("created_at", {
      ascending: false
    })
  ])

  return (
    <AdminDashboard
      initialPortfolio={portfolioItems ?? []}
      initialTeam={teamMembers ?? []}
      initialSubmissions={submissions ?? []}
    />
  )
}
