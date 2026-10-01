// packages/shared/src/utils/validation.ts

import { z } from "zod";

// Auth Schemas
export const LoginSchema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(128),
});

// Exam Schemas
export const CreateExamSchema = z.object({
  name: z.string().min(1).max(200),
  course_id: z.string().uuid(),
  time_limit: z.number().min(60).max(10800),
  blueprint: z.array(z.object({
    topic_id: z.string().uuid(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    count: z.number().min(1).max(20),
  })).min(1).max(20),
  max_attempts: z.number().min(1).max(1001).optional(),
});

export const SessionInSchema = z.object({
  exam_id: z.string().uuid(),
  new_attempt: z.boolean().optional(),
});

// Upload Schemas
export const UploadInitSchema = z.object({
  attempt_id: z.string().uuid(),
  kind: z.enum(["AUDIO", "VIDEO"]),
  size: z.number().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mime_type: z.enum(["audio/webm", "video/webm", "audio/mp4", "video/mp4", "audio/ogg"]),
});

// Grading Schemas
export const GradeOutputSchema = z.object({
  confidence: z.number().min(0).max(1),
  criteria: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    comment: z.string().max(2000),
  })),
  missing_concepts: z.array(z.string()),
  reasoning_summary: z.string().max(3000),
  reference_chunk_ids: z.array(z.string()).min(1),
});

// Course Schemas
export const CourseInSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
});

// Rubric Schemas
export const CriterionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(3000),
  max_score: z.number().min(0).max(100),
  weight: z.number().min(0).max(100).optional(),
});

export const RubricInSchema = z.object({
  name: z.string().min(1).max(200),
  criteria: z.array(CriterionSchema).min(1).max(20),
});

// Type exports
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateExamInput = z.infer<typeof CreateExamSchema>;
export type SessionInInput = z.infer<typeof SessionInSchema>;
export type UploadInitInput = z.infer<typeof UploadInitSchema>;
export type GradeOutputInput = z.infer<typeof GradeOutputSchema>;
export type CourseInInput = z.infer<typeof CourseInSchema>;
export type RubricInInput = z.infer<typeof RubricInSchema>;
