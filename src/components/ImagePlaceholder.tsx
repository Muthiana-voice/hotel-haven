import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImagePlaceholder({ src, alt, className }: { src?: string | null | undefined; alt: string; className?: string }) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
  return (
    <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)} aria-label={alt}>
      <ImageIcon className="size-8" />
    </div>
  );
}
