import OpenAI from "openai"
import {
  buildCvExtractUserPrompt,
  CV_EXTRACT_PROMPT_VERSION,
  CV_EXTRACT_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/cv-extract"
import {
  CvExtractValidationError,
  parseCvExtract,
  type CvExtractedProfile,
} from "@/lib/ai/schemas/cv-extract"
import {
  mapOpenAIError,
  resolveOpenAIApiKey,
} from "@/lib/openai/api-key"

function getOpenAIClient(apiKey?: string | null) {
  return new OpenAI({ apiKey: resolveOpenAIApiKey(apiKey) })
}

function getModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini"
}

export async function extractCvProfile(
  cvText: string,
  options?: { apiKey?: string | null }
): Promise<{
  profile: CvExtractedProfile
  model: string
  promptVersion: string
}> {
  const client = getOpenAIClient(options?.apiKey)
  const model = getModel()

  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CV_EXTRACT_SYSTEM_PROMPT },
        { role: "user", content: buildCvExtractUserPrompt(cvText) },
      ],
    })
  } catch (error) {
    throw mapOpenAIError(error)
  }

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("Empty CV extract response from OpenAI")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new CvExtractValidationError("CV extract response is not valid JSON")
  }

  const profile = parseCvExtract(parsed)
  return {
    profile,
    model,
    promptVersion: CV_EXTRACT_PROMPT_VERSION,
  }
}
