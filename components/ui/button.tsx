"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-primary text-primary-foreground shadow-soft hover:brightness-95",
          variant === "secondary" &&
            "border border-border bg-card text-card-foreground hover:bg-muted",
          variant === "ghost" && "text-muted-foreground hover:bg-muted hover:text-foreground",
          variant === "danger" && "bg-destructive text-white hover:brightness-95",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
