import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  normalizeEmail,
  normalizeGithub,
  normalizeLinkedIn,
  normalizePhone,
  parseCvExtract,
} from "./cv-extract"

describe("parseCvExtract", () => {
  it("parses a normal structured payload", () => {
    const result = parseCvExtract({
      first_name: "Vincent",
      last_name: "Giacalone",
      email: "vincentgiacalonepro@gmail.com",
      phone: "0699114226",
      date_of_birth: "02/11/1998",
      current_city: "Paris",
      current_title: "Product Builder",
      linkedin_url: "linkedin.com/in/vincentgiacalone",
      github_url: "imfire3",
      website_url: null,
      skills: ["Figma", "JIRA", "Figma"],
      experiences: [
        {
          title: "Product Owner",
          organization: "Fortuneo",
          location: "Paris",
          location_type: "hybrid",
          employment_type: "CDI",
          is_current: true,
          start_month: "01",
          start_year: "2022",
          end_month: null,
          end_year: null,
          description: "Discovery et delivery",
          skills: ["JIRA"],
        },
      ],
      education: [
        {
          name: "Master UI/UX Design",
          school: "Université Paris II",
          level: "Master",
          is_current: false,
          start_month: "09",
          start_year: "2018",
          end_month: "06",
          end_year: "2020",
          description: "Design produit",
          skills: ["Figma"],
        },
      ],
      languages: [
        { language: "Français", level: "Maternel" },
        { language: "Anglais", level: "Intermédiaire" },
      ],
    })

    assert.equal(result.first_name, "Vincent")
    assert.equal(result.last_name, "Giacalone")
    assert.equal(result.email, "vincentgiacalonepro@gmail.com")
    assert.equal(result.phone, "0699114226")
    assert.equal(result.date_of_birth, "1998-11-02")
    assert.equal(result.linkedin_url, "https://linkedin.com/in/vincentgiacalone")
    assert.equal(result.github_url, "https://github.com/imfire3")
    assert.deepEqual(result.skills, ["Figma", "JIRA"])
    assert.equal(result.experience_entries.length, 1)
    assert.equal(result.experience_entries[0].title, "Product Owner")
    assert.equal(result.experience_entries[0].isCurrent, true)
    assert.equal(result.education_entries[0].name, "Master UI/UX Design")
    assert.equal(result.language_entries[0].level, "Natif")
    assert.equal(result.language_entries[1].level, "Intermédiaire")
  })

  it("normalizes LinkedIn @handle and labeled phone", () => {
    const result = parseCvExtract({
      first_name: "Vincent",
      last_name: "Giacalone",
      email: "VincentGiacalonePro@gmail.com",
      phone: "Telephone : +33 6 99 11 42 26",
      linkedin_url: "@vincentgiacalone",
      github_url: "Github : imfire3",
      skills: [],
      experiences: [],
      education: [],
      languages: [],
    })

    assert.equal(result.email, "vincentgiacalonepro@gmail.com")
    assert.equal(result.phone, "+33 6 99 11 42 26")
    assert.equal(result.linkedin_url, "https://linkedin.com/in/vincentgiacalone")
    assert.equal(result.github_url, "https://github.com/imfire3")
  })

  it("keeps missing fields as null and does not invent a phone", () => {
    const result = parseCvExtract({
      first_name: "Ada",
      last_name: null,
      email: null,
      phone: null,
      date_of_birth: null,
      current_city: "",
      current_title: null,
      linkedin_url: null,
      github_url: null,
      website_url: null,
      skills: [],
      experiences: [],
      education: [],
      languages: [],
    })

    assert.equal(result.first_name, "Ada")
    assert.equal(result.last_name, null)
    assert.equal(result.email, null)
    assert.equal(result.phone, null)
    assert.equal(result.date_of_birth, null)
    assert.equal(result.current_city, null)
    assert.equal(result.linkedin_url, null)
    assert.equal(result.github_url, null)
    assert.deepEqual(result.skills, [])
    assert.deepEqual(result.experience_entries, [])
  })

  it("maps common language level synonyms", () => {
    const result = parseCvExtract({
      first_name: null,
      last_name: null,
      phone: null,
      date_of_birth: null,
      current_city: null,
      current_title: null,
      linkedin_url: null,
      website_url: null,
      skills: [],
      experiences: [],
      education: [],
      languages: [
        { language: "English", level: "native" },
        { language: "Spanish", level: "B1" },
        { language: "German", level: "beginner" },
      ],
    })

    assert.equal(result.language_entries[0].level, "Natif")
    assert.equal(result.language_entries[1].level, "Intermédiaire")
    assert.equal(result.language_entries[2].level, "Débutant")
  })

  it("rejects malformed payloads", () => {
    assert.throws(() => parseCvExtract("not-json-object"), /Invalid CV extract/)
  })

  it("drops experience rows without title and organization", () => {
    const result = parseCvExtract({
      first_name: null,
      last_name: null,
      phone: null,
      date_of_birth: null,
      current_city: null,
      current_title: null,
      linkedin_url: null,
      website_url: null,
      skills: ["SQL"],
      experiences: [{ title: null, organization: null, description: "ignored" }],
      education: [{ name: null, school: null }],
      languages: [{ language: null, level: "Courant" }],
    })

    assert.equal(result.experience_entries.length, 0)
    assert.equal(result.education_entries.length, 0)
    assert.equal(result.language_entries.length, 0)
    assert.deepEqual(result.skills, ["SQL"])
  })
})

describe("contact normalizers", () => {
  it("normalizes email, phone, linkedin and github", () => {
    assert.equal(normalizeEmail(" Ada@Example.COM "), "ada@example.com")
    assert.equal(normalizeEmail("not-an-email"), null)
    assert.equal(normalizePhone("Telephone : +33 6 99 11 42 26"), "+33 6 99 11 42 26")
    assert.equal(normalizeLinkedIn("Linkedin : @vincentgiacalone"), "https://linkedin.com/in/vincentgiacalone")
    assert.equal(normalizeGithub("Github : imfire3"), "https://github.com/imfire3")
    assert.equal(
      normalizeGithub("github.com/jordanmartin"),
      "https://github.com/jordanmartin"
    )
  })
})
