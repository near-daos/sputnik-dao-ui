"use client";

import { useQuery } from "@tanstack/react-query";
import * as z from "zod/mini";

const TreasurySchema = z.object({
  daoId: z.string(),
  config: z.object({
    name: z.string(),
    purpose: z.optional(z.string()),
    metadata: z.nullable(
      z.object({
        primaryColor: z.nullable(z.optional(z.string())),
        flagLogo: z.nullable(z.optional(z.string())),
      }),
    ),
    isConfidential: z.optional(z.boolean()),
  }),
  isMember: z.boolean(),
  isSaved: z.optional(z.boolean()),
  isHidden: z.optional(z.boolean()),
  isConfidential: z.optional(z.boolean()),
});

const TreasuryListSchema = z.array(TreasurySchema);

export type Treasury = z.infer<typeof TreasurySchema>;

const API_URL = "https://api.trezu.app/api/user/treasuries";

export function useUserTreasuries(accountId: string | null) {
  return useQuery({
    queryKey: ["userTreasuries", accountId],
    queryFn: async ({ signal }): Promise<Treasury[]> => {
      const res = await fetch(
        `${API_URL}?accountId=${encodeURIComponent(accountId ?? "")}`,
        { signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return TreasuryListSchema.parse(await res.json());
    },
    enabled: !!accountId,
    staleTime: 60_000,
  });
}

export function isDisplayableLogo(src: string | null | undefined): src is string {
  return typeof src === "string" && /^https?:\/\//.test(src);
}
