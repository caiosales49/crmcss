"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
        className
      )}
      {...props}
    />
  )
);

Select.displayName = "Select";
