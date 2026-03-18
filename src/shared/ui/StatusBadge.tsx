import type { ItemStatus } from "@/shared/api/types";
import { statusLabel } from "@/shared/lib/format";

const statusStyles: Record<ItemStatus, string> = {
  available: "bg-green-100 text-green-800",
  partially_funded: "bg-warm-beige text-olive-dark",
  funded: "bg-olive/20 text-olive-dark",
  archived: "bg-gray-100 text-gray-600",
};

interface StatusBadgeProps {
  status: ItemStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide
        rounded-pill
        ${statusStyles[status]}
        ${className}
      `}
    >
      {statusLabel(status)}
    </span>
  );
}
