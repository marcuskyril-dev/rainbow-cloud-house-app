import type { WishlistItemView } from "@/shared/api/types";
import { StatusBadge, ProgressBar, Button } from "@/shared/ui";
import { formatCurrency, fundingPercentage } from "@/shared/lib/format";
import { Gift, ExternalLink, Eye } from "lucide-react";

interface ItemCardProps {
  item: WishlistItemView;
  onContribute: (item: WishlistItemView) => void;
  onViewDetails: (item: WishlistItemView) => void;
}

export function ItemCard({
  item,
  onContribute,
  onViewDetails,
}: ItemCardProps) {
  const pct = fundingPercentage(item.totalContributed, item.price);
  const displayName =
    item.name.length > 75 ? `${item.name.slice(0, 72).trimEnd()}...` : item.name;
  const isContributable =
    item.status === "available" || item.status === "partially_funded";
  const isClaimed = item.status === "funded";

  return (
    <div className="bg-surface-card rounded-lg border border-border overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-white">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-contain aspect-square"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary">
            <Gift size={48} strokeWidth={1} />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={item.status} />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold font-display text-base leading-tight line-clamp-4 lg:h-[80px]">
            {displayName}
          </h3>
          <span className="text-base font-semibold whitespace-nowrap">
            {formatCurrency(item.price)}
          </span>
        </div>

        {item.description && (
          <p className="text-sm text-text-secondary mb-3 lg:min-h-[80px]">
            {item.description}
          </p>
        )}

        <div className="mb-3">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>{formatCurrency(item.totalContributed)} raised</span>
            <span>{pct}%</span>
          </div>
          <ProgressBar value={item.totalContributed} max={item.price} />
        </div>

        <div className="mt-auto pt-3 flex flex-col gap-2">
          {isContributable && (
            <Button
              size="sm"
              icon={<Gift size={14} />}
              onClick={() => onContribute(item)}
            >
              Contribute
            </Button>
          )}

          {isClaimed && (
            <Button
              size="sm"
              variant="outline"
              icon={<Eye size={14} />}
              onClick={() => onViewDetails(item)}
            >
              Fully covered
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={!item.productUrl}
            icon={<ExternalLink size={14} />}
            onClick={() => window.open(item.productUrl, "_blank")}
          >
            View product
          </Button>
        </div>
      </div>
    </div>
  );
}
