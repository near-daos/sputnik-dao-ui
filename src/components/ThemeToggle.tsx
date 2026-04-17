"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration guard: next-themes can't know the resolved theme on the
    // server, so we mount-then-render to avoid an SSR/CSR icon mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const label = !mounted
    ? "Toggle theme"
    : theme === "system"
      ? `System theme (${resolvedTheme})`
      : theme === "dark"
        ? "Dark theme"
        : "Light theme";

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="relative h-8 w-8 px-0"
    >
      {mounted ? (
        theme === "system" ? (
          <Monitor className="h-4 w-4" />
        ) : resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
