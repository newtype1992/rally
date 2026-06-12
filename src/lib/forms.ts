import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import type { z } from 'zod';

export function applyZodErrors<TFieldValues extends FieldValues>(
  error: z.ZodError,
  setError: UseFormSetError<TFieldValues>,
) {
  error.issues.forEach((issue) => {
    const field = issue.path[0];
    if (typeof field !== 'string') {
      return;
    }
    setError(field as FieldPath<TFieldValues>, { message: issue.message });
  });
}

export function messageFromError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'The request could not be completed.';
}
