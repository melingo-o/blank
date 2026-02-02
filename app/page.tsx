import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { TeamSection } from "@/components/team-section"
import { ServicesSection } from "@/components/services-section"
import { PortfolioSection } from "@/components/portfolio-section"
import { IntakeSection } from "@/components/intake-section"
import { Footer } from "@/components/footer"
import { createSupabaseServer } from "@/lib/supabase/server"

export default async function HomePage() {
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let portfolioItems = undefined
  let teamMembers = undefined

  if (hasSupabase) {
    const supabase = await createSupabaseServer()
    const portfolioQuery = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("is_visible", true)
      .order("order_index", {
        ascending: true
      })

    const teamQuery = await supabase
      .from("team_members")
      .select("*")
      .order("order_index", {
        ascending: true
      })

    if (portfolioQuery.error?.message.includes("is_visible")) {
      const fallback = await supabase
        .from("portfolio_items")
        .select("*")
        .order("order_index", {
          ascending: true
        })
      portfolioItems = fallback.data ?? undefined
    } else {
      portfolioItems = portfolioQuery.data ?? undefined
    }

    teamMembers = teamQuery.data ?? undefined
  }

  return (
    <main>
      <Header />
      <Hero />
      <ServicesSection />
      <PortfolioSection initialItems={portfolioItems} />
      <TeamSection initialMembers={teamMembers} />
      <IntakeSection />
      <Footer />
    </main>
  )
}
