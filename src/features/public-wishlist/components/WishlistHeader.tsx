import { Button } from "@/shared/ui";
import { useNavigate } from "react-router-dom";
interface WishlistHeaderProps {
  giftedCount: number;
  remainingCount: number;
}

export function WishlistHeader({
  giftedCount,
  remainingCount,
}: WishlistHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="text-center py-12 px-4">
      <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
        Our Housewarming Wishlist
      </h1>

      <div className="flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary max-w-xl mx-auto text-lg leading-relaxed">
          We&rsquo;re so excited to start our new chapter! If you&rsquo;d like to
          help us settle in, here are some things we&rsquo;ve been dreaming of for
          our new home.
        </p>
        <Button size="md" onClick={() => navigate("/faq")}>
          See Our FAQ
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8">
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-olive/10 text-olive-dark text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-olive" />
          {giftedCount} Items Gifted
        </span>
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-dusty-blue/10 text-dusty-blue-dark text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-dusty-blue" />
          {remainingCount} Items Remaining
        </span>
      </div>
    </header>
  );
}
