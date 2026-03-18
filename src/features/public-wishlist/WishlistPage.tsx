import { ContributeModal } from "@/features/contributions/components/ContributeModal";
import { ContributionHistoryModal } from "@/features/contributions/components/ContributionHistoryModal";
import type { WishlistItemView } from "@/shared/api/types";
import { useItems } from "@/shared/hooks/useItems";
import { PublicLayout } from "@/shared/layout/PublicLayout";
import { useMemo, useState } from "react";
import { FilterTabs, type FilterValue } from "./components/FilterTabs";
import { ItemCard } from "./components/ItemCard";
import { WishlistHeader } from "./components/WishlistHeader";

export function WishlistPage() {
  const { data, isLoading, error } = useItems();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [contributeItem, setContributeItem] =
    useState<WishlistItemView | null>(null);
  const [detailItem, setDetailItem] = useState<WishlistItemView | null>(null);

  const items = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    if (filter === "all") return items.filter((i) => i.status !== "archived");
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const giftedCount = items.filter((i) => i.status === "funded").length;
  const remainingCount = items.filter(
    (i) => i.status === "available" || i.status === "partially_funded",
  ).length;

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4">
        <WishlistHeader giftedCount={giftedCount} remainingCount={remainingCount} />

        <FilterTabs value={filter} onChange={setFilter} />

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-olive border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-error">
            Failed to load wishlist. Please try again later.
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-16">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onContribute={setContributeItem}
                onViewDetails={setDetailItem}
              />
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-text-secondary py-12">
                No items match this filter.
              </p>
            )}
          </div>
        )}
      </div>
      <ContributeModal
        item={contributeItem}
        open={!!contributeItem}
        onClose={() => setContributeItem(null)}
      />
      <ContributionHistoryModal
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
      />
    </PublicLayout>
  );
}
