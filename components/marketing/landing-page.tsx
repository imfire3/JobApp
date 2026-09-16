"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useSyncExternalStore } from "react"
import {
  LANDING_LOCALE_STORAGE_KEY,
  landingCopy,
  resolveLandingLocale,
  type LandingLocale,
} from "@/lib/marketing/landing-copy"

const localeListeners = new Set<() => void>()

const emitLocaleChange = () => {
  for (const listener of localeListeners) listener()
}

const subscribeLocale = (listener: () => void) => {
  localeListeners.add(listener)
  return () => {
    localeListeners.delete(listener)
  }
}

const getLocaleSnapshot = (): LandingLocale =>
  resolveLandingLocale(window.localStorage.getItem(LANDING_LOCALE_STORAGE_KEY))

const getServerLocaleSnapshot = (): LandingLocale => "fr"

export const LandingPage = () => {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot
  )

  const handleLocale = useCallback((next: LandingLocale) => {
    window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, next)
    emitLocaleChange()
  }, [])

  const t = landingCopy[locale]

  return (
    <div
      className="landing-root min-h-screen text-[var(--jt-ink)]"
      lang={locale}
      style={{
        ["--jt-bg" as string]: "#0f1419",
        ["--jt-surface" as string]: "#171d24",
        ["--jt-ink" as string]: "#e8eef4",
        ["--jt-muted" as string]: "#9aa8b5",
        ["--jt-line" as string]: "#2a3440",
        ["--jt-accent" as string]: "#2ec4b6",
        ["--jt-accent-ink" as string]: "#041512",
        background:
          "radial-gradient(1200px 600px at 80% -10%, rgba(46,196,182,0.12), transparent 55%), radial-gradient(900px 500px at 0% 40%, rgba(46,196,182,0.05), transparent 50%), var(--jt-bg)",
        fontFamily: "var(--font-marketing-sans), system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes jt-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .jt-fade-up { animation: jt-fade-up 0.7s ease-out both; }
        .jt-fade-up-delay-1 { animation-delay: 0.08s; }
        .jt-fade-up-delay-2 { animation-delay: 0.16s; }
        .jt-fade-up-delay-3 { animation-delay: 0.24s; }
        .jt-step { animation: jt-fade-up 0.55s ease-out both; }
      `}</style>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
        <p
          className="text-xl tracking-tight text-[var(--jt-ink)] md:text-2xl"
          style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
        >
          {t.brand}
        </p>
        <div className="flex items-center gap-2 md:gap-3">
          <div
            className="flex rounded-md border border-[var(--jt-line)] p-0.5"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              aria-pressed={locale === "fr"}
              onClick={() => handleLocale("fr")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                locale === "fr"
                  ? "bg-[var(--jt-accent)] text-[var(--jt-accent-ink)]"
                  : "text-[var(--jt-muted)] hover:text-[var(--jt-ink)]"
              }`}
            >
              {t.localeFr}
            </button>
            <button
              type="button"
              aria-pressed={locale === "en"}
              onClick={() => handleLocale("en")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                locale === "en"
                  ? "bg-[var(--jt-accent)] text-[var(--jt-accent-ink)]"
                  : "text-[var(--jt-muted)] hover:text-[var(--jt-ink)]"
              }`}
            >
              {t.localeEn}
            </button>
          </div>
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-2 text-sm text-[var(--jt-muted)] transition-colors hover:text-[var(--jt-ink)] sm:inline-flex"
          >
            {t.navLogin}
          </Link>
          <Link
            href="/login?signup=1"
            className="inline-flex rounded-md bg-[var(--jt-accent)] px-3 py-2 text-sm font-medium text-[var(--jt-accent-ink)] transition-opacity hover:opacity-90"
          >
            {t.navSignup}
          </Link>
        </div>
      </header>

      <main>
        <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <Image
              src="/marketing/jobs-board.png"
              alt=""
              fill
              priority
              className="object-cover object-top opacity-[0.28]"
              sizes="100vw"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(15,20,25,0.55) 0%, rgba(15,20,25,0.82) 45%, rgba(15,20,25,1) 100%)",
              }}
            />
          </div>

          <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-end gap-8 px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-20">
            <div className="max-w-3xl">
              <p
                className="jt-fade-up text-5xl leading-none tracking-tight text-[var(--jt-ink)] md:text-7xl"
                style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
              >
                {t.brand}
              </p>
              <h1
                className="jt-fade-up jt-fade-up-delay-1 mt-6 max-w-2xl text-2xl leading-snug tracking-tight text-[var(--jt-ink)] md:text-4xl"
                style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
              >
                {t.heroHeadline}
              </h1>
              <p className="jt-fade-up jt-fade-up-delay-2 mt-4 max-w-xl text-base leading-relaxed text-[var(--jt-muted)] md:text-lg">
                {t.heroSub}
              </p>
              <div className="jt-fade-up jt-fade-up-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login?signup=1"
                  className="inline-flex items-center justify-center rounded-md bg-[var(--jt-accent)] px-5 py-3 text-sm font-semibold text-[var(--jt-accent-ink)] transition-opacity hover:opacity-90"
                >
                  {t.ctaSignup}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md border border-[var(--jt-line)] bg-[var(--jt-surface)]/70 px-5 py-3 text-sm font-medium text-[var(--jt-ink)] transition-colors hover:border-[var(--jt-accent)]"
                >
                  {t.ctaLogin}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
          <h2
            className="max-w-2xl text-3xl tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
          >
            {t.problemTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--jt-muted)] md:text-lg">
            {t.problemBody}
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {t.problemPoints.map((point) => (
              <li
                key={point}
                className="border-l-2 border-[var(--jt-accent)] pl-4 text-[var(--jt-ink)]"
              >
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-[var(--jt-line)] bg-[var(--jt-surface)]/40 py-20">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <h2
              className="text-3xl tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
            >
              {t.howTitle}
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-5">
              {t.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="jt-step"
                  style={{ animationDelay: `${index * 0.07}s` }}
                >
                  <p className="text-xs font-semibold tracking-[0.14em] text-[var(--jt-accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3
                    className="mt-3 text-xl tracking-tight"
                    style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--jt-muted)]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
          <h2
            className="text-3xl tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
          >
            {t.zoomTitle}
          </h2>
          <p className="mt-4 max-w-xl text-base text-[var(--jt-muted)] md:text-lg">
            {t.zoomBody}
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-5">
            {t.zoomSections.map((label, index) => (
              <li key={label}>
                <p
                  className="text-2xl text-[var(--jt-accent)]"
                  style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
                >
                  {index + 1}
                </p>
                <p className="mt-2 text-sm leading-snug text-[var(--jt-ink)]">{label}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-[var(--jt-line)] bg-[var(--jt-surface)]/40 py-20">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--jt-accent)]">
              ADD-ON
            </p>
            <h2
              className="mt-3 max-w-2xl text-3xl tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
            >
              {t.extensionTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--jt-muted)] md:text-lg">
              {t.extensionBody}
            </p>

            <div className="mt-12 grid gap-12 md:grid-cols-2">
              <div>
                <h3
                  className="text-xl tracking-tight"
                  style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
                >
                  {t.extensionInstallTitle}
                </h3>
                <ol className="mt-6 space-y-4">
                  {t.extensionInstallSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-relaxed">
                      <span className="shrink-0 font-semibold text-[var(--jt-accent)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[var(--jt-ink)]">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h3
                  className="text-xl tracking-tight"
                  style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
                >
                  {t.extensionUseTitle}
                </h3>
                <ol className="mt-6 space-y-4">
                  {t.extensionUseSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-relaxed">
                      <span className="shrink-0 font-semibold text-[var(--jt-accent)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[var(--jt-ink)]">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <p className="mt-10 max-w-2xl border-l-2 border-[var(--jt-accent)] pl-4 text-sm leading-relaxed text-[var(--jt-muted)]">
              {t.extensionNote}
            </p>
          </div>
        </section>

        <section className="border-t border-[var(--jt-line)] py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 md:flex-row md:items-end md:justify-between md:px-8">
            <div className="max-w-xl">
              <h2
                className="text-3xl tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-marketing-display), sans-serif" }}
              >
                {t.closingTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--jt-muted)]">
                {t.closingBody}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?signup=1"
                className="inline-flex items-center justify-center rounded-md bg-[var(--jt-accent)] px-5 py-3 text-sm font-semibold text-[var(--jt-accent-ink)] transition-opacity hover:opacity-90"
              >
                {t.ctaSignup}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-[var(--jt-line)] px-5 py-3 text-sm font-medium text-[var(--jt-ink)] transition-colors hover:border-[var(--jt-accent)]"
              >
                {t.ctaLogin}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
