import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  hasCompletedProductWelcomeLocal,
  markProductWelcomeCompletedLocal,
  PRODUCT_WELCOME_STORAGE_KEY,
} from "@/lib/onboarding/product-welcome"

describe("product welcome local persistence", () => {
  it("marks and reads completion", () => {
    const store = new Map<string, string>()
    const original = globalThis.localStorage

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
      },
    })

    try {
      assert.equal(hasCompletedProductWelcomeLocal(), false)
      markProductWelcomeCompletedLocal()
      assert.equal(store.get(PRODUCT_WELCOME_STORAGE_KEY), "1")
      assert.equal(hasCompletedProductWelcomeLocal(), true)
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      })
    }
  })

  it("treats legacy guide keys as completed", () => {
    const store = new Map<string, string>([["jobapp_product_guide_v2", "1"]])
    const original = globalThis.localStorage

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
      },
    })

    try {
      assert.equal(hasCompletedProductWelcomeLocal(), true)
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      })
    }
  })
})
