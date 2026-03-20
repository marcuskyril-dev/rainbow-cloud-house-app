import type { WishlistItemView } from "@/shared/api/types";
import { StatusBadge, Button } from "@/shared/ui";
import { formatCurrency, fundingPercentage } from "@/shared/lib/format";
import { Pencil, Trash2, Gift } from "lucide-react";
import { ProgressBar } from "@/shared/ui";

interface AdminItemCardProps {
  item: WishlistItemView;
  onEdit: (item: WishlistItemView) => void;
  onDelete: (item: WishlistItemView) => void;
}

export function AdminItemCard({
  item,
  onEdit,
  onDelete,
}: AdminItemCardProps) {
  const pct = fundingPercentage(item.totalContributed, item.price);

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
            {item.name}
          </h3>
          <span className="text-base font-semibold whitespace-nowrap text-olive">
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
            <span>
              {formatCurrency(item.totalContributed)} /{" "}
              {formatCurrency(item.price)}
            </span>
            <span>{pct}%</span>
          </div>
          <ProgressBar value={item.totalContributed} max={item.price} />
        </div>

        <div className="mt-auto pt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Pencil size={14} />}
            onClick={() => onEdit(item)}
            className="flex-1"
          >
            Edit
          </Button>

          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 size={16} />}
            onClick={() => onDelete(item)}
            className="px-3 text-text-secondary hover:text-error"
          >
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
