import { useAuth } from "@/features/auth";
import type { WishlistItemView } from "@/shared/api/types";
import { useDeleteItem, useItems } from "@/shared/hooks/useItems";
import { Button } from "@/shared/ui";
import { LogOut, Plus } from "lucide-react";
import { useState } from "react";
import { AddEditItemModal } from "./components/AddEditItemModal";
import { AdminItemCard } from "./components/AdminItemCard";

export function AdminDashboard() {
  const { data, isLoading } = useItems();
  const deleteItem = useDeleteItem();
  const { signOut } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItemView | null>(null);

  const items = data?.items ?? [];

  async function handleDelete(item: WishlistItemView) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteItem.mutateAsync(item.id);
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <nav className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            Admin Dashboard
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<LogOut size={14} />}
            onClick={signOut}
          >
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-display">Wishlist Items</h1>
          <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
            Add Item
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-olive border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <p className="text-lg mb-2">No items yet</p>
            <p className="text-sm">Click &ldquo;Add Item&rdquo; to create your first wishlist item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map((item) => (
              <AdminItemCard
                key={item.id}
                item={item}
                onEdit={setEditItem}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <AddEditItemModal
        open={showAdd || !!editItem}
        item={editItem}
        onClose={() => {
          setShowAdd(false);
          setEditItem(null);
        }}
      />
    </div>
  );
}
