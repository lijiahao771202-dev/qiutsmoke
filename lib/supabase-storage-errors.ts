export type SupabaseStorageErrorLike = {
  message?: string | null;
  statusCode?: string | number | null;
  status?: string | number | null;
  error?: string | null;
  code?: string | number | null;
  name?: string | null;
};

function normalizeErrorText(error: SupabaseStorageErrorLike | null | undefined) {
  return [
    error?.message,
    error?.error,
    error?.name,
    error?.code == null ? null : String(error.code),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasStatus(
  error: SupabaseStorageErrorLike | null | undefined,
  expectedStatus: number
) {
  return (
    Number(error?.statusCode) === expectedStatus ||
    Number(error?.status) === expectedStatus ||
    Number(error?.code) === expectedStatus
  );
}

export function isSupabaseStorageMissingError(error: SupabaseStorageErrorLike | null | undefined) {
  if (!error) return false;
  if (hasStatus(error, 404)) return true;

  const normalized = normalizeErrorText(error);
  return (
    normalized.includes("not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("no such")
  );
}

export function isSupabaseStorageAlreadyExistsError(
  error: SupabaseStorageErrorLike | null | undefined
) {
  if (!error) return false;
  if (hasStatus(error, 409)) return true;

  const normalized = normalizeErrorText(error);
  return normalized.includes("already exists") || normalized.includes("duplicate");
}
