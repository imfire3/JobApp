import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { demoRequestSchema } from "./schema"
import {
  DEFAULT_DEMO_NOTIFY_EMAIL,
  buildDemoRequestEmail,
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

describe("sendDemoRequestEmail", () => {
  it("sends via injected sender to the default notify address", async () => {
    const calls: Array<{
      from: string
      to: string
      subject: string
      text: string
    }> = []

    await sendDemoRequestEmail(
      {
        first_name: "Marie",
        last_name: "Dupont",
        email: "marie@example.com",
      },
      {
        notifyEmail: DEFAULT_DEMO_NOTIFY_EMAIL,
        fromEmail: "JobTracker <beth.t@example.com>",
        send: async (payload) => {
          calls.push(payload)
          return { id: "email_1" }
        },
      }
    )

    assert.equal(calls.length, 1)
    assert.equal(calls[0]?.to, "vincentgiacalonepro@gmail.com")
    assert.match(calls[0]?.subject ?? "", /Marie Dupont/)
  })

  it("propagates sender failures", async () => {
    await assert.rejects(
      () =>
        sendDemoRequestEmail(
          {
            first_name: "Marie",
            last_name: "Dupont",
            email: "marie@example.com",
          },
          {
            send: async () => {
              throw new Error("Resend down")
            },
          }
        ),
      /Resend down/
    )
  })
})
