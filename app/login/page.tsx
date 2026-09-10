import { Suspense } from "react"
import LoginPageClient from "./login-client"
import { isSelfSignupAllowed } from "@/lib/auth/self-signup"

export default function LoginPage() {
  const allowSelfSignup = isSelfSignupAllowed()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-base text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <LoginPageClient allowSelfSignup={allowSelfSignup} />
    </Suspense>
  )
}
