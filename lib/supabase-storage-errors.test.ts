// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  isSupabaseStorageAlreadyExistsError,
  isSupabaseStorageMissingError,
  isSupabaseStoragePayloadTooLargeError,
} from "./supabase-storage-errors.ts";

test("recognizes bucket-not-found errors as missing storage resources", () => {
  assert.equal(isSupabaseStorageMissingError({ message: "Bucket not found" }), true);
  assert.equal(isSupabaseStorageMissingError({ message: "Object not found" }), true);
  assert.equal(isSupabaseStorageMissingError({ status: 404 }), true);
  assert.equal(isSupabaseStorageMissingError({ statusCode: "404" }), true);
  assert.equal(
    isSupabaseStorageMissingError({ name: "StorageUnknownError", originalError: {} }),
    true
  );
  assert.equal(isSupabaseStorageMissingError({ message: "permission denied" }), false);
});

test("recognizes already-existing bucket races as benign", () => {
  assert.equal(
    isSupabaseStorageAlreadyExistsError({ message: "Bucket already exists", statusCode: 409 }),
    true
  );
  assert.equal(isSupabaseStorageAlreadyExistsError({ message: "Bucket not found" }), false);
});

test("recognizes storage payload size limit errors", () => {
  assert.equal(isSupabaseStoragePayloadTooLargeError({ statusCode: "413" }), true);
  assert.equal(
    isSupabaseStoragePayloadTooLargeError({
      message: "The object exceeded the maximum allowed size",
      status: 400,
      statusCode: "413",
    }),
    true
  );
  assert.equal(isSupabaseStoragePayloadTooLargeError({ message: "Bucket not found" }), false);
});

test("recognizes storage download 400 unknown errors as missing objects", () => {
  assert.equal(
    isSupabaseStorageMissingError({
      name: "StorageUnknownError",
      originalError: { status: 400, statusText: "Bad Request" },
    }),
    true
  );
});
