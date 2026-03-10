import AdminDashboard from "./AdminDashboard"
import { requireAdmin } from "@/lib/admin"

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin()

  const [
    { data: creators },
    { data: portfolioItems },
    { data: teamMembers },
    { data: submissions }
  ] = await Promise.all([
    supabase.from("creators").select("*").order("created_at", {
      ascending: false
    }),
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
      initialCreators={creators ?? []}
      initialPortfolio={portfolioItems ?? []}
      initialTeam={teamMembers ?? []}
      initialSubmissions={submissions ?? []}
    />
  )
}
