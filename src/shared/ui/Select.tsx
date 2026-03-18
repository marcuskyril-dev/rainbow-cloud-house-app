import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  children?: ReactNode;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  function Select(
    { value, onValueChange, options, placeholder, label, error },
    ref,
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <span className="text-sm font-semibold text-text-primary">
            {label}
          </span>
        )}
        <RadixSelect.Root value={value} onValueChange={onValueChange}>
          <RadixSelect.Trigger
            ref={ref}
            className={`
              inline-flex items-center justify-between gap-2
              w-full rounded-md border border-border bg-surface px-3 py-2.5
              text-text-primary
              focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
              cursor-pointer
              ${error ? "border-error" : ""}
            `}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon>
              <ChevronDown size={16} className="text-text-secondary" />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content className="overflow-hidden rounded-md border border-border bg-surface shadow-lg z-50">
              <RadixSelect.Viewport className="p-1">
                {options.map((opt) => (
                  <RadixSelect.Item
                    key={opt.value}
                    value={opt.value}
                    className="relative flex items-center px-8 py-2 text-sm rounded cursor-pointer select-none hover:bg-surface-muted focus:bg-surface-muted outline-none"
                  >
                    <RadixSelect.ItemIndicator className="absolute left-2">
                      <Check size={14} />
                    </RadixSelect.ItemIndicator>
                    <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  },
);
