import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});

export const examSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug such as 2026-computing"),
    description: z.string().trim().max(8000).optional().or(z.literal("")),
    duration_minutes: z.coerce.number().int().min(1).max(240),
    pass_mark: z.union([z.coerce.number().min(0).max(9999), z.nan()]).optional(),
    available_from: z.string().optional(),
    available_until: z.string().optional(),
    exam_type: z.enum(["mcq", "mixed"]),
    published: z.boolean(),
    randomise_questions: z.boolean(),
    randomise_options: z.boolean(),
  })
  .refine(
    (value) =>
      !value.available_from ||
      !value.available_until ||
      new Date(value.available_until) > new Date(value.available_from),
    { message: "Available until must be after available from", path: ["available_until"] },
  );

export const questionTypeSchema = z.enum([
  "single_choice",
  "multiple_choice",
  "true_false",
  "short_answer",
  "long_answer",
]);

export const questionSchema = z.object({
  type: questionTypeSchema,
  question_text: z.string().trim().min(1).max(8000),
  marks: z.coerce.number().min(0.5).max(100),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .optional(),
  correct_option_ids: z.array(z.string()).optional(),
  acceptable_answers: z.array(z.string().trim().min(1)).optional(),
});
