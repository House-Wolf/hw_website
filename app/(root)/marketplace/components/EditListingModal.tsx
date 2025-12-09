"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  quantity?: number;
  category: string;
  imageUrl?: string;
  images?: { imageUrl: string }[];
}

interface EditListingModalProps {
  listing: Listing;
  onClose: () => void;
  onSave: (updatedListing: Partial<Listing>) => Promise<void>;
}

const categories = ["Weapons", "Armor", "Clothing", "Components", "Items", "Services", "Rentals", "Misc"];

/**
 * @component EditListingModal
 * @description A modal component for editing marketplace listings.
 * @param {EditListingModalProps} props - The properties for the EditListingModal component.  
 * @returns {JSX.Element} The rendered EditListingModal component.
 * @author House Wolf Dev Team
 */
export default function EditListingModal({
  listing,
  onClose,
  onSave,
}: EditListingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: listing.title,
    description: listing.description || "",
    price: listing.price,
    quantity: listing.quantity || 1,
    category: listing.category,
    imageUrl: listing.imageUrl || listing.images?.[0]?.imageUrl || "",
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "price" || name === "quantity" ? parseFloat(value) || 0 : value,
    }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
          bg-gradient-to-br from-[var(--background-elevated)] to-[var(--background-card)]
          border-2 border-[var(--hw-steel-teal)]/40
          rounded-2xl shadow-[0_0_60px_rgba(17,78,98,0.4)]
          p-6 md:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg
            bg-[var(--background)]/80 hover:bg-[var(--background)]
            border border-[var(--hw-steel-teal)]/20 hover:border-[var(--hw-steel-teal)]/40
            text-[var(--foreground)] transition cursor-pointer"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider
          text-[var(--hw-steel-teal)] mb-6">
          Edit Listing
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg
                bg-[var(--background)] text-[var(--foreground)]
                border-2 border-[var(--hw-steel-teal)]/20
                focus:border-[var(--hw-steel-teal)]/40
                focus:ring-2 focus:ring-[var(--hw-steel-teal)]/30
                outline-none transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 rounded-lg
                bg-[var(--background)] text-[var(--foreground)]
                border-2 border-[var(--hw-steel-teal)]/20
                focus:border-[var(--hw-steel-teal)]/40
                focus:ring-2 focus:ring-[var(--hw-steel-teal)]/30
                outline-none transition resize-none"
            />
          </div>

          {/* Price & Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Price (aUEC)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-lg
                  bg-[var(--background)] text-[var(--foreground)]
                  border-2 border-[var(--hw-steel-teal)]/20
                  focus:border-[var(--hw-steel-teal)]/40
                  focus:ring-2 focus:ring-[var(--hw-steel-teal)]/30
                  outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-4 py-3 rounded-lg
                  bg-[var(--background)] text-[var(--foreground)]
                  border-2 border-[var(--hw-steel-teal)]/20
                  focus:border-[var(--hw-steel-teal)]/40
                  focus:ring-2 focus:ring-[var(--hw-steel-teal)]/30
                  outline-none transition"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg
                bg-[var(--background)] text-[var(--foreground)]
                border-2 border-[var(--hw-steel-teal)]/20
                focus:border-[var(--hw-steel-teal)]/40
                focus:ring-2 focus:ring-[var(--hw-steel-teal)]/30
                outline-none transition cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Image URL
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 rounded-lg
                bg-[var(--background)] text-[var(--foreground)]
                border-2 border-[var(--hw-steel-teal)]/20
                focus:border-[var(--hw-steel-teal)]/40
                focus:ring-2 focus:ring-[var(--hw-steel-teal)]/30
                outline-none transition"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg
                bg-[var(--background)] text-[var(--foreground)]
                border-2 border-[var(--hw-steel-teal)]/20
                hover:border-[var(--hw-steel-teal)]/40
                hover:bg-[var(--background-elevated)]
                font-bold uppercase tracking-wider text-sm
                transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-lg
                bg-gradient-to-r from-[var(--hw-steel-teal)] to-[var(--hw-steel-teal)]/80
                hover:from-[var(--hw-steel-teal)]/90 hover:to-[var(--hw-steel-teal)]
                text-white font-bold uppercase tracking-wider text-sm
                border-2 border-[var(--hw-steel-teal)]/50
                shadow-[0_4px_16px_rgba(17,78,98,0.3)]
                hover:shadow-[0_6px_24px_rgba(17,78,98,0.5)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
