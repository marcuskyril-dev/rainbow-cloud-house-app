import { Modal, Button, ProgressBar, ContributorAvatar } from "@/shared/ui";
import {
  formatCurrency,
  fundingPercentage,
  formatDate,
} from "@/shared/lib/format";
import type { WishlistItemView, Contribution } from "@/shared/api/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";

interface ContributionHistoryModalProps {
  item: WishlistItemView | null;
  open: boolean;
  onClose: () => void;
}

export function ContributionHistoryModal({
  item,
  open,
  onClose,
}: ContributionHistoryModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["contributions", item?.id],
    queryFn: () =>
      apiClient.get<{ contributions: Contribution[] }>(
        `/items/${item!.id}/contributions`,
      ),
    enabled: open && !!item,
  });

  if (!item) return null;

  const pct = fundingPercentage(item.totalContributed, item.price);
  const contributions = data?.contributions ?? [];

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Contribution History"
    >
      <p className="text-dusty-blue text-sm font-medium mb-4">
        {item.name} &mdash; {formatCurrency(item.price)}
      </p>

      <div className="bg-surface-muted rounded-md p-4 mb-6">
        <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">
          Total Raised
        </p>
        <div className="flex items-baseline justify-between">
          <p className="text-xl font-bold text-olive">
            {formatCurrency(item.totalContributed)}
          </p>
          <span className="text-sm text-text-secondary">{pct}% Complete</span>
        </div>
        <ProgressBar
          value={item.totalContributed}
          max={item.price}
          className="mt-2"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-3 border-olive border-t-transparent rounded-full" />
        </div>
      ) : contributions.length === 0 ? (
        <p className="text-center text-text-secondary py-8">
          No contributions yet.
        </p>
      ) : (
        <ul className="space-y-3 mb-6">
          {contributions.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <ContributorAvatar name={c.contributorName} />
                <div>
                  <p className="font-semibold text-sm">{c.contributorName}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(c.createdAt)}
                  </p>
                </div>
              </div>
              <span className="font-semibold">
                {formatCurrency(c.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button variant="primary" className="w-full" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}
