import OpenAI from "openai";
import {
  buildCoverLetterUserPrompt,
  COVER_LETTER_PROMPT_VERSION,
  COVER_LETTER_SYSTEM_PROMPT,
  type CoverLetterPromptInput,
} from "@/lib/ai/prompts/cover-letter";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

function getCoverLetterModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

function detectLanguage(text: string): string {
  const sample = text.slice(0, 500).toLowerCase();
  const frenchHints = [" le ", " la ", " les ", " des ", " une ", " dans ", " pour ", " avec ", " vous "];
  const hits = frenchHints.filter((hint) => sample.includes(hint)).length;
  return hits >= 2 ? "fr" : "en";
}

export async function generateCoverLetterContent(
  input: CoverLetterPromptInput
): Promise<{ content: string; model: string; language: string; promptVersion: string }> {
  const client = getOpenAIClient();
  const model = getCoverLetterModel();
  const language = detectLanguage(input.description ?? input.cvText);

  const response = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      { role: "system", content: COVER_LETTER_SYSTEM_PROMPT },
      { role: "user", content: buildCoverLetterUserPrompt(input) },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty cover letter from OpenAI");
  }

  return {
    content,
    model,
    language,
    promptVersion: COVER_LETTER_PROMPT_VERSION,
  };
}
