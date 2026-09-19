import { z } from "zod";

export const examSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const startAttemptSchema = z.object({
  slug: examSlugSchema,
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
});

export const candidateAnswerSchema = z
  .object({
    selected: z.array(z.string().min(1).max(32)).max(20).optional(),
    text: z.string().max(8000).optional(),
  })
  .refine((value) => value.selected !== undefined || value.text !== undefined, {
    message: "Answer is required",
  });
