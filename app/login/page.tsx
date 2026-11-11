import { Suspense } from "react"
import LoginPageClient from "./login-client"
import {
  isHostedSignupEnabled,
  isSignupOpen,
} from "@/lib/auth/self-signup"

export default function LoginPage() {
  const signupOpen = isSignupOpen()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-base text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <LoginPageClient
        allowSelfSignup={signupOpen}
        hostedSignup={isHostedSignupEnabled()}
      />
    </Suspense>
  )
}
