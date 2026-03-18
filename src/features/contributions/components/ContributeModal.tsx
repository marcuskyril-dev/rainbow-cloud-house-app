import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal, Button, Input, ProgressBar } from "@/shared/ui";
import { useContribute } from "@/shared/hooks/useContribution";
import { generateRequestId } from "@/shared/lib/idempotency";
import {
  formatCurrency,
  fundingPercentage,
  remainingAmount,
} from "@/shared/lib/format";
import { ApiClientError } from "@/shared/api";
import type { WishlistItemView } from "@/shared/api/types";
import { useState } from "react";
import { ArrowRight, Gift } from "lucide-react";

interface ContributeModalProps {
  item: WishlistItemView | null;
  open: boolean;
  onClose: () => void;
}

export function ContributeModal({
  item,
  open,
  onClose,
}: ContributeModalProps) {
  const contribute = useContribute();
  const [apiError, setApiError] = useState("");

  const remaining = item ? remainingAmount(item.totalContributed, item.price) : 0;
  const maxDollars = remaining / 100;

  const schema = z.object({
    contributorName: z.string().min(1, "Name is required").max(100),
    amount: z
      .number({ message: "Enter a valid amount" })
      .min(1, "Minimum contribution is $1.00")
      .max(maxDollars, `Maximum contribution is ${formatCurrency(remaining)}`),
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0 },
  });

  function handleClose() {
    reset();
    setApiError("");
    onClose();
  }

  async function onSubmit(data: FormData) {
    if (!item) return;
    setApiError("");
    try {
      await contribute.mutateAsync({
        itemId: item.id,
        contributorName: data.contributorName,
        amount: Math.round(data.amount * 100),
        requestId: generateRequestId(),
      });
      handleClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "OVERPAYMENT") {
          setApiError("This amount would exceed the remaining balance.");
        } else {
          setApiError(err.message);
        }
      } else {
        setApiError("Something went wrong. Please try again.");
      }
    }
  }

  if (!item) return null;

  const pct = fundingPercentage(item.totalContributed, item.price);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      title="Contribute to a Shared Gift"
      description="Help your friends furnish their new home"
    >
      <div className="flex items-center gap-4 bg-surface-muted rounded-md p-4 mb-4">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-16 h-16 rounded-md object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-md bg-warm-beige-light flex items-center justify-center">
            <Gift size={24} className="text-olive" />
          </div>
        )}
        <div>
          {item.category && (
            <p className="text-xs font-semibold text-dusty-blue uppercase tracking-wide">
              {item.category}
            </p>
          )}
          <p className="font-bold">{item.name}</p>
          <p className="font-bold text-olive">{formatCurrency(item.price)}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">
          Current Contributions
        </p>
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold text-olive">
            {formatCurrency(item.totalContributed)} funded
          </p>
          <span className="text-sm text-text-secondary">{pct}%</span>
        </div>
        <ProgressBar
          value={item.totalContributed}
          max={item.price}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>Goal: {formatCurrency(item.price)}</span>
          <span>{formatCurrency(remaining)} remaining</span>
        </div>
      </div>

      {apiError && (
        <p className="text-sm text-error bg-red-50 rounded-md px-3 py-2 mb-4">
          {apiError}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Your Unique Name"
          placeholder="Enter your name (e.g. Auntie Sarah)"
          error={errors.contributorName?.message}
          {...register("contributorName")}
        />

        <Input
          label="Contribution Amount"
          type="number"
          step="0.01"
          min="1"
          max={maxDollars}
          prefix="$"
          placeholder="0.00"
          hint={`Minimum contribution is $1.00`}
          error={errors.amount?.message}
          {...register("amount", { valueAsNumber: true })}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={contribute.isPending}
          icon={<ArrowRight size={16} />}
        >
          {contribute.isPending ? "Processing..." : "Contribute Now"}
        </Button>

        <button
          type="button"
          onClick={handleClose}
          className="w-full text-center text-sm text-text-secondary hover:text-text-primary cursor-pointer"
        >
          Maybe Later
        </button>
      </form>
    </Modal>
  );
}
