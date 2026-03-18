import { PublicLayout } from "@/shared/layout/PublicLayout";

export function EventDetailsPage() {
  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-14">
        <header className="text-center py-8 px-4">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
            Event Details
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto text-lg leading-relaxed">
            Check back soon!
          </p>
        </header>
      </div>
    </PublicLayout>
  );
}

