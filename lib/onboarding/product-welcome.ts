export const PRODUCT_WELCOME_STORAGE_KEY = "jobapp_product_welcome_v1"
export const PRODUCT_WELCOME_EVENT = "jobapp:product-welcome-completed"

/** Legacy overlay tour keys — treat as already completed so existing users are not forced again. */
const LEGACY_GUIDE_KEYS = [
  "jobapp_product_guide_v2",
  "jobapp_product_tour_v1",
  "jobapp_product_guide_seen",
  "jobapp_product_guide_done",
] as const

export const hasCompletedProductWelcomeLocal = (): boolean => {
  try {
    if (localStorage.getItem(PRODUCT_WELCOME_STORAGE_KEY) === "1") return true
    return LEGACY_GUIDE_KEYS.some((key) => localStorage.getItem(key) === "1")
  } catch {
    return false
  }
}

export const markProductWelcomeCompletedLocal = (): void => {
  try {
    localStorage.setItem(PRODUCT_WELCOME_STORAGE_KEY, "1")
  } catch {
    // ignore quota / private mode
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PRODUCT_WELCOME_EVENT))
  }
}
