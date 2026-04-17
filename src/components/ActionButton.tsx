"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * A button that can be disabled with a tooltip explaining why. Radix's
 * TooltipTrigger doesn't receive pointer events from a disabled <button>,
 * so we wrap it in a focusable <span>.
 */
export function ActionButton({
  children,
  onClick,
  disabled,
  disabledTooltip,
  size = "sm",
  variant = "outline",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  disabledTooltip?: string | null;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
}) {
  const btn = (
    <Button
      size={size}
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </Button>
  );

  if (!disabled || !disabledTooltip) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-block">
          {btn}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        {disabledTooltip}
      </TooltipContent>
    </Tooltip>
  );
}
