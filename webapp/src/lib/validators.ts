import { z } from 'zod';

// Enums matching database constraints
export const difficultyEnum = z.enum(['easy', 'medium', 'hard']);
export const statusEnum = z.enum(['solved', 'attempted', 'to_revisit', 'bookmarked']);

// Schema for a single pattern in a problem payload
export const patternSchema = z.object({
  pattern_id: z.number().int().positive().nullable().optional(),
  pattern_name: z.string().min(1).nullable().optional(),
  approach_notes: z.string().nullable().optional(),
  code_snippet: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  time_complexity: z.string().nullable().optional(),
  space_complexity: z.string().nullable().optional(),
  mistake_notes: z.string().nullable().optional(),
}).refine(data => data.pattern_id !== undefined || data.pattern_name !== undefined, {
  message: "Either pattern_id or pattern_name must be provided",
  path: ["pattern_id/pattern_name"]
});

// Schema for creating a new problem
export const createProblemSchema = {
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    leetcode_url: z.string().url('Must be a valid URL'),
    leetcode_number: z.number().int().positive().nullable().optional(),
    difficulty: difficultyEnum,
    status: statusEnum.default('attempted'),
    date_solved: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
    patterns: z.array(patternSchema).optional(),
    
    // AI Fields
    code_hash: z.string().optional(),
    ai_suggested_patterns: z.array(z.any()).optional(),
    ai_time_complexity: z.string().nullable().optional(),
    ai_space_complexity: z.string().nullable().optional(),
    ai_reasoning: z.string().nullable().optional(),
    
    // Feature Fields
    topic_tags: z.array(z.string()).optional(),
  }),
};

// Schema for updating a problem (basic details only)
export const updateProblemSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    leetcode_url: z.string().url().optional(),
    leetcode_number: z.number().int().positive().optional().nullable(),
    difficulty: difficultyEnum.optional(),
    status: statusEnum.optional(),
    date_solved: z.string().datetime().optional().or(z.date().optional()).nullable(),
  }),
};

// Schema for patching patterns on an existing problem
export const patchPatternsSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
  }),
  body: z.object({
    action: z.enum(['add', 'update', 'remove']),
    pattern: patternSchema,
  }),
};

// Schema for querying problems (GET /api/problems)
export const getProblemsQuerySchema = {
  query: z.object({
    status: statusEnum.optional(),
    difficulty: difficultyEnum.optional(),
    pattern_id: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z.enum(['date_solved', 'created_at']).default('created_at'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(20),
  }),
};

export const idParamSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
  }),
};
