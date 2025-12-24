/**
 * Common API Types
 * Error responses and shared types
 */

import { z } from "zod";

// ===== ERROR SCHEMAS =====

export const ErrorResponseSchema = z.object({
  error: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const NotFoundResponseSchema = z.object({
  error: z.string(),
});
export type NotFoundResponse = z.infer<typeof NotFoundResponseSchema>;

export const UnauthorizedResponseSchema = z.object({
  error: z.string(),
});
export type UnauthorizedResponse = z.infer<typeof UnauthorizedResponseSchema>;

// ===== PAGINATION =====

export const PaginationParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  });

// ===== SUCCESS RESPONSE =====

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
