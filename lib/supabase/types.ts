export type PortfolioItem = {
  id: string
  name: string
  niche: string
  followers: string
  growth: string
  image_url: string
  instagram_handle: string | null
  is_visible: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export type TeamMember = {
  id: string
  name: string
  nickname: string
  role: string
  focus: string
  order_index: number
  created_at: string
  updated_at: string
}

export type Submission = {
  id: string
  type: "apply" | "business"
  name: string | null
  phone: string | null
  sns: string | null
  intro: string | null
  company: string | null
  contact: string | null
  budget: string | null
  details: string | null
  status: "new" | "reviewed" | "archived"
  created_at: string
}
