import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type AccordionItem = {
  title: string;
  content: string;
};

type AccordionProps = {
  items: AccordionItem[];
  className?: string;
  /** Initially open panel index, or null for all closed */
  defaultOpenIndex?: number | null;
};

export function Accordion({
  items,
  className = "",
  defaultOpenIndex = null,
}: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    defaultOpenIndex ?? null,
  );

  return (
    <div className={`flex flex-col gap-4 md:gap-5 ${className}`}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={`${item.title}-${index}`}
            className={`
              rounded-4xl overflow-hidden transition-colors duration-200
              ${isOpen
                ? "bg-surface-muted shadow-sm"
                : "bg-surface shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              }
            `}
          >
            <button
              type="button"
              onClick={() =>
                setOpenIndex((prev) => (prev === index ? null : index))
              }
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left md:px-8 md:py-6"
              aria-expanded={isOpen}
            >
              <span className="font-display text-base font-bold text-olive-dark md:text-lg">
                {item.title}
              </span>
              <ChevronDown
                className={`size-5 shrink-0 text-olive-dark transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                  }`}
                aria-hidden
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mx-6 border-t border-border/80 md:mx-8" />
                <div className="px-6 pt-4 pb-6 md:px-8 md:pt-5 md:pb-8">
                  <p className="whitespace-pre-line font-body text-sm leading-relaxed text-text-primary md:text-base">
                    {item.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
