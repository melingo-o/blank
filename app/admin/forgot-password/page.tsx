import ForgotPasswordForm from "./ForgotPasswordForm"

type ForgotPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminForgotPasswordPage({
  searchParams
}: ForgotPasswordPageProps) {
  const params = searchParams ? await searchParams : {}
  const rawLoginId = params.loginId
  const initialLoginId = Array.isArray(rawLoginId)
    ? rawLoginId[0] || "admin"
    : rawLoginId || "admin"

  return <ForgotPasswordForm initialLoginId={initialLoginId.trim() || "admin"} />
}
