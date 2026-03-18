import * as Tabs from "@radix-ui/react-tabs";
import type { ItemStatus } from "@/shared/api/types";

type FilterValue = "all" | ItemStatus;

interface FilterTabsProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

const tabs: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All Items" },
  { value: "available", label: "Available" },
  { value: "partially_funded", label: "Partially Funded" },
  { value: "funded", label: "Funded" },
];

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(v) => onChange(v as FilterValue)}
    >
      <Tabs.List className="flex gap-2 mb-8 flex-wrap">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className="px-5 py-2 rounded-pill text-sm font-medium border border-border
              data-[state=active]:bg-text-primary data-[state=active]:text-text-inverse data-[state=active]:border-text-primary
              data-[state=inactive]:text-text-primary data-[state=inactive]:hover:bg-surface-muted
              transition-colors cursor-pointer"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export type { FilterValue };
