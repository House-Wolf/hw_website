"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import ImageUpload from "../../profile/components/ImageUpload";

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  categoryId: number;
  price: number;
  currency: string;
  quantity: number;
  condition: string | null;
  location: string | null;
  status: string;
  images: { imageUrl: string }[];
}

interface EditListingModalProps {
  listing: Listing;
  categories: Category[];
  updateAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function EditListingModal({
  listing,
  categories,
  updateAction,
  onClose,
  isAdmin = false,
}: EditListingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const currentCategory = categories.find(cat => cat.id === listing.categoryId);
  const initialParentId = currentCategory?.parentId || listing.categoryId;
  const initialSubcategoryId = currentCategory?.parentId ? listing.categoryId : null;

  const [selectedParentId, setSelectedParentId] = useState<number | null>(initialParentId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(initialSubcategoryId);
  const [imageUrl, setImageUrl] = useState<string>(listing.images?.[0]?.imageUrl || "");

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-[var(--background-card)] border border-[var(--border-soft)] rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4 relative z-[10000]"
      >
        <div className="sticky top-0 bg-[var(--background-card)] border-b border-[var(--border-soft)] p-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Edit Listing
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form action={updateAction} className="p-6 space-y-4">
          <input type="hidden" name="listingId" value={listing.id} />
          <input type="hidden" name="returnTab" value={isAdmin ? "manage" : "my-posts"} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-title" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Title *
              </label>
              <input
                type="text"
                id="edit-title"
                name="title"
                required
                maxLength={100}
                defaultValue={listing.title}
                className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </div>

            <div>
              <label htmlFor="edit-parentCategory" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Category *
              </label>
              <select
                id="edit-parentCategory"
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
              <label htmlFor="edit-subcategory" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Subcategory (Optional)
              </label>
              <select
                id="edit-subcategory"
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
            <label htmlFor="edit-description" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Description *
            </label>
            <textarea
              id="edit-description"
              name="description"
              required
              rows={5}
              maxLength={1000}
              defaultValue={listing.description}
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-price" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Price (aUEC) *
              </label>
              <input
                type="number"
                id="edit-price"
                name="price"
                required
                min="0"
                step="0.01"
                defaultValue={listing.price}
                className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
              <input type="hidden" name="currency" value="aUEC" />
            </div>

            <div>
              <label htmlFor="edit-quantity" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Quantity
              </label>
              <input
                type="number"
                id="edit-quantity"
                name="quantity"
                min="1"
                defaultValue={listing.quantity}
                className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-location" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Location (Optional)
            </label>
            <input
              type="text"
              id="edit-location"
              name="location"
              maxLength={100}
              defaultValue={listing.location || ""}
              className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
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

          {isAdmin && (
            <div>
              <label htmlFor="edit-status" className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Status
              </label>
              <select
                id="edit-status"
                name="status"
                defaultValue={listing.status}
                className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="SOLD">Sold</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border-soft)] bg-[var(--background-secondary)]/60 hover:bg-[var(--background-elevated)] transition-colors text-[var(--foreground-muted)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] cursor-pointer"
            >
              Update Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
