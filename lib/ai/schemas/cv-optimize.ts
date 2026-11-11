import { z } from "zod";

export const CV_OPTIMIZE_SCHEMA_VERSION = "v1";

const sourceSchema = z.object({
  kind: z.enum(["cv", "candidate_confirmation"]),
  quote: z.string().min(1),
  location: z.string().min(1),
});

const placementSchema = z
  .object({
    mode: z.enum(["replace", "append_section", "insert_after"]).default("replace"),
    anchor_text: z.string().nullable().optional(),
  })
  .default({ mode: "replace" });

const modificationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["reformulation", "ajout", "reorganisation", "alleger"]),
  section: z.string().min(1),
  element_id: z.string().nullable().optional(),
  element_label: z.string().nullable().optional(),
  original_text: z.string().nullable().optional(),
  proposed_text: z.string().min(1),
  // Some models omit sources even though original_text is an exact CV quote.
  // They are reconstructed server-side from original_text when possible.
  sources: z.array(sourceSchema).default([]),
  keywords_added: z.array(z.string().min(1)).default([]),
  justification: z.string().min(1),
  confirmation_required: z.boolean().default(false),
  question: z.string().nullable().optional(),
  offer_requirement: z.string().nullable().optional(),
  placement: placementSchema.optional(),
});

const optimizedSectionSchema = z.object({
  section: z.string().min(1),
  content: z.string().min(1),
});

const questionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  reason: z.string().min(1),
  related_modification_ids: z.array(z.string().min(1)).default([]),
  answer_type: z.enum(["yes_no", "short_text"]).default("yes_no"),
});

const keywordReportItemSchema = z.object({
  term: z.string().min(1),
  status: z.enum(["deja_present", "integre_immédiat", "integre_apres_confirmation"]),
});

const keywordToConfirmSchema = z.object({
  term: z.string().min(1),
  reason: z.string().min(1),
});

export const cvOptimizeResponseSchema = z
  .object({
    status: z.enum(["ok", "needs_info", "already_optimized"]),
    orientation: z.string().min(1),
    modifications: z.array(modificationSchema).default([]),
    optimized_sections: z.array(optimizedSectionSchema).default([]),
    questions: z.array(questionSchema).default([]),
    keywords_report: z
      .object({
        present: z.array(keywordReportItemSchema).default([]),
        to_confirm: z.array(keywordToConfirmSchema).default([]),
      })
      .default({ present: [], to_confirm: [] }),
  })
  .superRefine((data, ctx) => {
    // Validation stricte : propositions nécessitant confirmation ne vont pas dans optimized_sections
    const confirmationIds = new Set(
      data.modifications
        .filter((m) => m.confirmation_required)
        .map((m) => m.id),
    );
    if (confirmationIds.size > 0 && data.optimized_sections.length > 0) {
      // On tolère, mais on s'assurera côté apply que seules les modifications non-confirmées sont appliquées
      // (ce refine est informatif)
    }

    for (const m of data.modifications) {
      if (m.confirmation_required && !m.question?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modifications", data.modifications.indexOf(m), "question"],
          message: "question requise si confirmation_required=true",
        });
      }
      if (
        (m.type === "reformulation" || m.type === "reorganisation" || m.type === "alleger") &&
        !m.original_text?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modifications", data.modifications.indexOf(m), "original_text"],
          message: "original_text requis pour ce type de modification",
        });
      }
    }
  });

export type CvOptimizeResponse = z.infer<typeof cvOptimizeResponseSchema>;
export type CvOptimizeModification = z.infer<typeof modificationSchema>;
export type CvOptimizeQuestion = z.infer<typeof questionSchema>;
export type CvOptimizeSource = z.infer<typeof sourceSchema>;
