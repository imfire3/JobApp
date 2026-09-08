import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { demoRequestSchema } from "./schema"
import {
  DEFAULT_DEMO_NOTIFY_EMAIL,
  buildDemoRequestEmail,
  buildFormSubmitPayload,
  sendDemoRequestEmail,
} from "./notify"

describe("demoRequestSchema", () => {
  it("accepts a valid demo request", () => {
    const parsed = demoRequestSchema.parse({
      first_name: "Marie",
      last_name: "Dupont",
      email: "marie@example.com",
      message: "Je suis PO",
    })
    assert.equal(parsed.first_name, "Marie")
    assert.equal(parsed.message, "Je suis PO")
    assert.equal(parsed.website, undefined)
  })

  it("rejects missing required fields", () => {
    assert.throws(() =>
      demoRequestSchema.parse({
        first_name: "",
        last_name: "Dupont",
        email: "marie@example.com",
      })
    )
  })

  it("rejects invalid email", () => {
    assert.throws(() =>
      demoRequestSchema.parse({
        first_name: "Marie",
        last_name: "Dupont",
        email: "not-an-email",
      })
    )
  })

  it("normalizes empty message to undefined", () => {
    const parsed = demoRequestSchema.parse({
      first_name: "Marie",
      last_name: "Dupont",
      email: "marie@example.com",
      message: "   ",
    })
    assert.equal(parsed.message, undefined)
  })

  it("keeps honeypot website when filled", () => {
    const parsed = demoRequestSchema.parse({
      first_name: "Marie",
      last_name: "Dupont",
      email: "marie@example.com",
      website: "https://spam.example",
    })
    assert.equal(parsed.website, "https://spam.example")
  })
})

describe("buildDemoRequestEmail", () => {
  it("includes contact fields and optional message", () => {
    const { subject, text } = buildDemoRequestEmail({
      first_name: "Marie",
      last_name: "Dupont",
      email: "marie@example.com",
      message: "Hello",
    })
    assert.match(subject, /Marie Dupont/)
    assert.match(text, /marie@example.com/)
    assert.match(text, /Hello/)
  })
})

describe("buildFormSubmitPayload", () => {
  it("builds FormSubmit fields with subject and captcha off", () => {
    const payload = buildFormSubmitPayload({
      first_name: "Marie",
      last_name: "Dupont",
      email: "marie@example.com",
      message: "Hello",
    })
    assert.equal(payload._template, "table")
    assert.equal(payload._captcha, "false")
    assert.match(payload._subject, /Marie Dupont/)
    assert.equal(payload.email, "marie@example.com")
    assert.equal(payload.message, "Hello")
  })
})

describe("sendDemoRequestEmail", () => {
  it("POSTs to FormSubmit ajax URL for the notify address", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []

    await sendDemoRequestEmail(
      {
        first_name: "Marie",
        last_name: "Dupont",
        email: "marie@example.com",
      },
      {
        notifyEmail: DEFAULT_DEMO_NOTIFY_EMAIL,
        fetch: async (url, init) => {
          calls.push({ url: String(url), init })
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        },
      }
    )

    assert.equal(calls.length, 1)
    assert.equal(
      calls[0]?.url,
      `https://formsubmit.co/ajax/${encodeURIComponent("vincentgiacalonepro@gmail.com")}`
    )
    assert.equal(calls[0]?.init?.method, "POST")
    const body = JSON.parse(String(calls[0]?.init?.body ?? "{}")) as {
      _subject: string
      email: string
    }
    assert.match(body._subject, /Marie Dupont/)
    assert.equal(body.email, "marie@example.com")
  })

  it("propagates FormSubmit HTTP failures", async () => {
    await assert.rejects(
      () =>
        sendDemoRequestEmail(
          {
            first_name: "Marie",
            last_name: "Dupont",
            email: "marie@example.com",
          },
          {
            fetch: async () =>
              new Response("rate limited", {
                status: 429,
              }),
          }
        ),
      /FormSubmit failed \(429\)/
    )
  })
})
