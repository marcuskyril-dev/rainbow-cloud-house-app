import { faqAccordionContent } from "@/features/public-pages/faqAccordionContent";
import { PublicLayout } from "@/shared/layout/PublicLayout";
import { Accordion } from "@/shared/ui";

export function FaqPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-14">
        <header className="px-4 py-8 text-center">
          <h1 className="mb-4 font-display text-4xl font-bold md:text-5xl">
            FAQ
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-text-secondary">
            Common questions about using the wishlist.
          </p>
        </header>
        <div className="mx-auto max-w-3xl">
          <Accordion items={faqAccordionContent} />
        </div>
      </div>
    </PublicLayout>
  );
}
