function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const bgColors = [
  "bg-olive",
  "bg-dusty-blue",
  "bg-warm-beige-dark",
  "bg-olive-dark",
  "bg-dusty-blue-dark",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return bgColors[Math.abs(hash) % bgColors.length];
}

interface ContributorAvatarProps {
  name: string;
  size?: "sm" | "md";
}

export function ContributorAvatar({
  name,
  size = "md",
}: ContributorAvatarProps) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  return (
    <div
      className={`${sizeClass} ${colorFromName(name)} rounded-full flex items-center justify-center text-text-inverse font-semibold shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}
