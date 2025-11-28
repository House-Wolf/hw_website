"use client";

import { Plus } from "lucide-react";
import { useState, useMemo } from "react";
import ImageUpload from "./ImageUpload";

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
}

interface CreatePostTabProps {
  categories: Category[];
  createAction: (formData: FormData) => Promise<void>;
}

export default function CreatePostTab({ categories, createAction }: CreatePostTabProps) {
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");

  const parentCategories = useMemo(
    () => categories.filter(cat => cat.parentId === null),
    [categories]
  );

  const subcategories = useMemo(
    () => selectedParentId
      ? categories.filter(cat => cat.parentId === selectedParentId)
      : [],
    [categories, selectedParentId]
  );

  const hasSubcategories = subcategories.length > 0;

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedParentId(value ? parseInt(value) : null);
    setSelectedSubcategoryId(null);
  };

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSubcategoryId(value ? parseInt(value) : null);
  };

  const finalCategoryId = selectedSubcategoryId || selectedParentId;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
            New Listing
          </p>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Create Marketplace Post
          </h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Fill out the form below to create a new listing on the marketplace.
          </p>
        </div>
        <Plus className="text-[var(--accent-main)]" size={20} />
      </div>

      <form action={createAction} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              maxLength={100}
              placeholder="e.g., Rare Armor Set"
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </div>

          <div>
            <label htmlFor="parentCategory" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Category *
            </label>
            <select
              id="parentCategory"
              value={selectedParentId || ""}
              onChange={handleParentChange}
              required={!finalCategoryId}
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              <option value="">Select a category</option>
              {parentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasSubcategories && (
          <div>
            <label htmlFor="subcategory" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Subcategory (Optional)
            </label>
            <select
              id="subcategory"
              value={selectedSubcategoryId || ""}
              onChange={handleSubcategoryChange}
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              <option value="">All {parentCategories.find(c => c.id === selectedParentId)?.name}</option>
              {subcategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Select a specific subcategory or leave as All
            </p>
          </div>
        )}

        <input type="hidden" name="categoryId" value={finalCategoryId || ""} />

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            maxLength={1000}
            placeholder="Describe your item in detail..."
            className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] resize-y"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Price (aUEC) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
            <input type="hidden" name="currency" value="aUEC" />
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              defaultValue="1"
              placeholder="1"
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
            Location (Optional)
          </label>
          <input
            type="text"
            id="location"
            name="location"
            maxLength={100}
            placeholder="e.g., Area 18, Hurston"
            className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
            Image (Optional)
          </label>
          <ImageUpload
            value={imageUrl}
            onChange={setImageUrl}
            onClear={() => setImageUrl("")}
          />
          <input type="hidden" name="imageUrl" value={imageUrl} />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] flex items-center gap-2"
          >
            <Plus size={16} />
            Create Listing
          </button>
        </div>
      </form>
    </div>
  );
}
