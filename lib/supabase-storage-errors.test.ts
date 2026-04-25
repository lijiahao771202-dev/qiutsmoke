// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  isSupabaseStorageAlreadyExistsError,
  isSupabaseStorageMissingError,
} from "./supabase-storage-errors.ts";

test("recognizes bucket-not-found errors as missing storage resources", () => {
  assert.equal(isSupabaseStorageMissingError({ message: "Bucket not found" }), true);
  assert.equal(isSupabaseStorageMissingError({ message: "Object not found" }), true);
  assert.equal(isSupabaseStorageMissingError({ status: 404 }), true);
  assert.equal(isSupabaseStorageMissingError({ statusCode: "404" }), true);
  assert.equal(isSupabaseStorageMissingError({ message: "permission denied" }), false);
});

test("recognizes already-existing bucket races as benign", () => {
  assert.equal(
    isSupabaseStorageAlreadyExistsError({ message: "Bucket already exists", statusCode: 409 }),
    true
  );
  assert.equal(isSupabaseStorageAlreadyExistsError({ message: "Bucket not found" }), false);
});
