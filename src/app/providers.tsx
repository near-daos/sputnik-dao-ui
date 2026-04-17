"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import {
  createNearConnectorService,
  createNearStore,
  createMainnetClient,
  NearProvider,
} from "react-near-ts";
import { TooltipProvider } from "@/components/ui/tooltip";

const nearStore = createNearStore({
  networkId: "mainnet",
  clientCreator: createMainnetClient,
  serviceCreator: createNearConnectorService({}),
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NearProvider nearStore={nearStore}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </NearProvider>
    </ThemeProvider>
  );
}
