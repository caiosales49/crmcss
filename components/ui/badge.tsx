import { cn } from "@/lib/cn";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-success/10 text-success",
        tone === "warning" && "bg-warning/15 text-amber-700 dark:text-amber-300",
        tone === "danger" && "bg-destructive/10 text-destructive",
        className
      )}
      {...props}
    />
  );
}
