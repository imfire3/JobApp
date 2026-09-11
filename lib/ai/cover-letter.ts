import OpenAI from "openai"
import {
  buildCoverLetterUserPrompt,
  COVER_LETTER_PROMPT_VERSION,
  COVER_LETTER_SYSTEM_PROMPT,
  type CoverLetterPromptInput,
} from "@/lib/ai/prompts/cover-letter"
import {
  parseCoverLetterPack,
  type CoverLetterPack,
} from "@/lib/ai/schemas/cover-letter"
import {
  mapOpenAIError,
  resolveOpenAIApiKey,
} from "@/lib/openai/api-key"

function getOpenAIClient(apiKey?: string | null) {
  return new OpenAI({ apiKey: resolveOpenAIApiKey(apiKey) })
}

function getCoverLetterModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini"
}

function detectLanguage(text: string): string {
  const sample = text.slice(0, 500).toLowerCase()
  const frenchHints = [
    " le ",
    " la ",
    " les ",
    " des ",
    " une ",
    " dans ",
    " pour ",
    " avec ",
    " vous ",
  ]
  const hits = frenchHints.filter((hint) => sample.includes(hint)).length
  return hits >= 2 ? "fr" : "en"
}

export type GenerateCoverLetterContentResult = CoverLetterPack & {
  /** @deprecated use letter — kept for callers expecting content */
  content: string
  model: string
  language: string
  promptVersion: string
}

export async function generateCoverLetterContent(
  input: CoverLetterPromptInput,
  options?: { apiKey?: string | null }
): Promise<GenerateCoverLetterContentResult> {
  const client = getOpenAIClient(options?.apiKey)
  const model = getCoverLetterModel()
  const language = detectLanguage(input.description ?? input.cvText)

  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await client.chat.completions.create({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: COVER_LETTER_SYSTEM_PROMPT },
        { role: "user", content: buildCoverLetterUserPrompt(input) },
      ],
    })
  } catch (error) {
    throw mapOpenAIError(error)
  }

  const raw = response.choices[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error("Empty cover letter from OpenAI")
  }

  const pack = parseCoverLetterPack(raw)

  return {
    ...pack,
    content: pack.letter,
    model,
    language,
    promptVersion: COVER_LETTER_PROMPT_VERSION,
  }
}
