import test from "node:test";
import assert from "node:assert/strict";

import {
  addTTSStudioCategory,
  addTTSStudioSubcategory,
  buildCreateCardCategoryAssignment,
  filterTTSStudioCardsBySelection,
  getTTSStudioCategories,
  normalizeTTSStudioCategoryConfig,
  type TTSStudioCategoryConfig,
} from "./tts-studio-taxonomy";

test("assigns newly created cards to the currently selected category and subcategory", () => {
  assert.deepEqual(
    buildCreateCardCategoryAssignment({ categoryId: "all", subcategoryId: "all" }),
    {}
  );
  assert.deepEqual(
    buildCreateCardCategoryAssignment({ categoryId: "custom-focus", subcategoryId: "all" }),
    { category_id: "custom-focus", subcategory_id: null }
  );
  assert.deepEqual(
    buildCreateCardCategoryAssignment({ categoryId: "custom-focus", subcategoryId: "morning" }),
    { category_id: "custom-focus", subcategory_id: "morning" }
  );
});

test("filters user cards by selected first and second level tags", () => {
  const cards = [
    { id: "1", content: "a", category_id: "custom-focus", subcategory_id: "morning" },
    { id: "2", content: "b", category_id: "custom-focus", subcategory_id: "night" },
    { id: "3", content: "c", category_id: "rain", subcategory_id: null },
  ];

  assert.deepEqual(
    filterTTSStudioCardsBySelection(cards, { categoryId: "all", subcategoryId: "all" }).map((card) => card.id),
    ["1", "2", "3"]
  );
  assert.deepEqual(
    filterTTSStudioCardsBySelection(cards, { categoryId: "custom-focus", subcategoryId: "all" }).map((card) => card.id),
    ["1", "2"]
  );
  assert.deepEqual(
    filterTTSStudioCardsBySelection(cards, { categoryId: "custom-focus", subcategoryId: "morning" }).map((card) => card.id),
    ["1"]
  );
});

test("adds custom first level tags and custom child tags under built-in categories", () => {
  const rootAdded = addTTSStudioCategory(undefined, "  我的练习  ", () => "custom-root");
  assert.equal(rootAdded.customCategories[0].id, "custom-root");
  assert.equal(rootAdded.customCategories[0].label, "我的练习");

  const childAdded = addTTSStudioSubcategory(rootAdded, "rain", "  复盘专用  ", () => "custom-child");
  const rain = getTTSStudioCategories(childAdded).find((category) => category.id === "rain");
  assert.equal(rain?.children?.some((child) => child.id === "custom-child" && child.label === "复盘专用"), true);
});

test("normalizes malformed saved category config safely", () => {
  const malformed = {
    customCategories: [
      { id: "", label: "bad" },
      { id: "custom-a", label: "  A  ", children: [{ id: "sub-a", label: "  子项  " }] },
    ],
    customChildrenByParentId: {
      rain: [{ id: "child-rain", label: " 雨中 " }, { id: "", label: "bad" }],
    },
  } satisfies TTSStudioCategoryConfig;

  const normalized = normalizeTTSStudioCategoryConfig(malformed);
  assert.deepEqual(normalized.customCategories, [
    { id: "custom-a", label: "A", icon: "🏷️", tone: "cyan", children: [{ id: "sub-a", label: "子项", icon: "•" }] },
  ]);
  assert.deepEqual(normalized.customChildrenByParentId, {
    rain: [{ id: "child-rain", label: "雨中", icon: "•" }],
  });
});
