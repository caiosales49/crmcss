import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center p-10 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}
