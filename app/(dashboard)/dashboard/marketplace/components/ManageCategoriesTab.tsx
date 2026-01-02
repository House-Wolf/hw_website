"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit, Trash2, X } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  isActive: boolean;
  sortOrder: number;
}

interface ManageCategoriesTabProps {
  categories: Category[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

export default function ManageCategoriesTab({
  categories,
  createAction,
  updateAction,
  deleteAction,
}: ManageCategoriesTabProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
            Admin Tools
          </p>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Manage Categories
          </h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Create, edit, and organize marketplace categories.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--foreground-muted)] border-b border-[var(--border-soft)]">
              <th className="py-2 pr-4 font-semibold">Name</th>
              <th className="py-2 pr-4 font-semibold">Parent Category</th>
              <th className="py-2 pr-4 font-semibold">Description</th>
              <th className="py-2 pr-4 font-semibold">Status</th>
              <th className="py-2 pr-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--foreground-muted)]">
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((category) => {
                const parentCategory = categories.find(c => c.id === category.parentId);
                return (
                  <tr key={category.id} className="align-top">
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-[var(--foreground)]">
                        {category.parentId ? "└─ " : ""}{category.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {parentCategory ? parentCategory.name : "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-[var(--foreground-muted)] line-clamp-2">
                        {category.description || "—"}
                      </span>
                    </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        category.isActive
                          ? "bg-green-500/10 text-green-500 border border-green-500/50"
                          : "bg-gray-500/10 text-gray-500 border border-gray-500/50"
                      }`}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] transition-colors text-[var(--foreground)] cursor-pointer"
                        aria-label="Edit category"
                      >
                        <Edit size={14} className="inline" />
                      </button>
                      <form action={deleteAction} className="inline">
                        <input type="hidden" name="categoryId" value={category.id} />
                        <button
                          type="submit"
                          onClick={(e) => {
                            if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
                              e.preventDefault();
                            }
                          }}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold border border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:border-red-500 transition-colors cursor-pointer"
                          aria-label="Delete category"
                        >
                          <Trash2 size={14} className="inline" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isCreating && (
        <CategoryModal
          title="Create Category"
          category={null}
          categories={categories}
          onClose={() => setIsCreating(false)}
          action={createAction}
        />
      )}

      {editingCategory && (
        <CategoryModal
          title="Edit Category"
          category={editingCategory}
          categories={categories}
          onClose={() => setEditingCategory(null)}
          action={updateAction}
        />
      )}
    </div>
  );
}

interface CategoryModalProps {
  title: string;
  category: Category | null;
  categories: Category[];
  onClose: () => void;
  action: (formData: FormData) => Promise<void>;
}

function CategoryModal({ title, category, categories, onClose, action }: CategoryModalProps) {
  const [name, setName] = useState(category?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer state update to avoid cascading render
    const timer = setTimeout(() => setMounted(true), 0);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      await action(formData);
      onClose();
    } catch (error) {
      console.error("Failed to save category:", error);
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background-card)] border border-[var(--border-soft)] rounded-lg shadow-lg max-w-2xl w-full m-4 relative z-[10000]">
        <div className="sticky top-0 bg-[var(--background-card)] border-b border-[var(--border-soft)] p-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {category && <input type="hidden" name="categoryId" value={category.id} />}
          <input type="hidden" name="slug" value={generateSlug(name)} />

          <div>
            <label htmlFor="cat-name" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Category Name *
            </label>
            <input
              type="text"
              id="cat-name"
              name="name"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weapons"
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </div>

          <div>
            <label htmlFor="cat-parentId" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Parent Category (Optional)
            </label>
            <select
              id="cat-parentId"
              name="parentId"
              defaultValue={category?.parentId?.toString() || ""}
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              <option value="">None (Top-level category)</option>
              {categories
                .filter(c => c.id !== category?.id && c.parentId === null)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Select a parent category to create a subcategory
            </p>
          </div>

          <div>
            <label htmlFor="cat-description" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Description (Optional)
            </label>
            <textarea
              id="cat-description"
              name="description"
              rows={3}
              maxLength={200}
              defaultValue={category?.description || ""}
              placeholder="Brief description of this category"
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] resize-y"
            />
          </div>

          <div>
            <label htmlFor="cat-isActive" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Status
            </label>
            <select
              id="cat-isActive"
              name="isActive"
              defaultValue={category?.isActive !== false ? "true" : "false"}
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border-soft)] bg-[var(--background-secondary)]/60 hover:bg-[var(--background-elevated)] transition-colors text-[var(--foreground-muted)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Saving..." : category ? "Update" : "Create"} {!isSubmitting && "Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
