"use client";

import { useState } from "react";
import Link from "next/link";
import { List, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import EditListingModal from "./EditListingModal";
import { SafeImage } from "@/components/utils/SafeImage";

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
  createdAt: Date;
  category: Category;
  images: { imageUrl: string }[];
  seller: {
    discordUsername: string;
    discordDisplayName: string | null;
  };
}

interface MyPostsTabProps {
  listings: Listing[];
  categories: Category[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

export default function MyPostsTab({
  listings,
  categories,
  totalCount,
  currentPage,
  pageSize,
  updateAction,
  deleteAction,
}: MyPostsTabProps) {
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
            Your Listings
          </p>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            My Posts
          </h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Manage your marketplace listings.
          </p>
        </div>
        <List className="text-[var(--accent-main)]" size={20} />
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--foreground-muted)]">
            You haven&apos;t created any listings yet.
          </p>
          <Link
            href="/dashboard/marketplace?tab=create"
            className="inline-block mt-4 px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] cursor-pointer"
          >
            Create Your First Post
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--foreground-muted)] border-b border-[var(--border-soft)]">
                  <th className="py-2 pr-4 font-semibold">Image</th>
                  <th className="py-2 pr-4 font-semibold">Title</th>
                  <th className="py-2 pr-4 font-semibold">Category</th>
                  <th className="py-2 pr-4 font-semibold">Price</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Created</th>
                  <th className="py-2 pr-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {listings.map((listing) => (
                  <tr key={listing.id} className="align-top">
                    <td className="py-3 pr-4">
                      <div className="w-10 h-10 rounded-md bg-[var(--background-elevated)] border border-[var(--border-soft)] overflow-hidden">
                        <SafeImage
                          src={listing.images?.[0]?.imageUrl}
                          alt={listing.title}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--foreground)]">
                          {listing.title}
                        </span>
                        <span className="text-xs text-[var(--foreground-muted)] line-clamp-2">
                          {listing.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 rounded-full bg-[var(--background-elevated)] border border-[var(--border-soft)] text-[var(--foreground)] text-xs font-semibold">
                        {listing.category.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="font-semibold text-[var(--foreground)]">
                        {listing.price.toLocaleString()} {listing.currency}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          listing.status === "ACTIVE"
                            ? "bg-green-500/10 text-green-500 border border-green-500/50"
                            : listing.status === "DRAFT"
                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/50"
                            : "bg-gray-500/10 text-gray-500 border border-gray-500/50"
                        }`}
                      >
                        {listing.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingListing(listing)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] transition-colors text-[var(--foreground)] cursor-pointer"
                          aria-label="Edit listing"
                        >
                          <Edit size={14} className="inline" />
                        </button>
                        <form action={deleteAction} className="inline">
                          <input type="hidden" name="listingId" value={listing.id} />
                          <input type="hidden" name="returnTab" value="my-posts" />
                          <button
                            type="submit"
                            onClick={(e) => {
                              if (!confirm("Are you sure you want to delete this listing?")) {
                                e.preventDefault();
                              }
                            }}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold border border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:border-red-500 transition-colors cursor-pointer"
                            aria-label="Delete listing"
                          >
                            <Trash2 size={14} className="inline" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-soft)]">
              <div className="text-sm text-[var(--foreground-muted)]">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} listings
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/marketplace?tab=my-posts&page=${currentPage - 1}`}
                  className={`px-3 py-2 rounded-md text-sm font-semibold border ${
                    currentPage === 1
                      ? "opacity-50 pointer-events-none border-[var(--border-soft)] bg-[var(--background-secondary)]/60 text-[var(--foreground-muted)]"
                      : "border-[var(--border-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] text-[var(--foreground)]"
                  } transition-colors`}
                  aria-disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} className="inline" />
                </Link>
                <span className="px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
                  Page {currentPage} of {totalPages}
                </span>
                <Link
                  href={`/dashboard/marketplace?tab=my-posts&page=${currentPage + 1}`}
                  className={`px-3 py-2 rounded-md text-sm font-semibold border ${
                    currentPage === totalPages
                      ? "opacity-50 pointer-events-none border-[var(--border-soft)] bg-[var(--background-secondary)]/60 text-[var(--foreground-muted)]"
                      : "border-[var(--border-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] text-[var(--foreground)]"
                  } transition-colors`}
                  aria-disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} className="inline" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          categories={categories}
          updateAction={updateAction}
          onClose={() => setEditingListing(null)}
        />
      )}
    </div>
  );
}
