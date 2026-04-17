"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useUserTreasuries,
  isDisplayableLogo,
  type Treasury,
} from "@/hooks/useUserTreasuries";

function TreasuryLogo({ t }: { t: Treasury }) {
  const src = t.config.metadata?.flagLogo ?? null;
  if (isDisplayableLogo(src)) {
    return (
      <Image
        src={src}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="h-8 w-8 shrink-0 rounded-md border bg-muted object-cover"
      />
    );
  }
  const initial = t.config.name?.trim().charAt(0).toUpperCase() || "D";
  const primary = t.config.metadata?.primaryColor;
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-semibold"
      style={primary ? { backgroundColor: primary, color: "#fff" } : undefined}
    >
      {initial}
    </div>
  );
}

export function MemberTreasuries({
  accountId,
  onPick,
}: {
  accountId: string | null;
  onPick?: (daoId: string) => void;
}) {
  const q = useUserTreasuries(accountId);

  if (!accountId) return null;

  if (q.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Could not load your treasuries. ({String(q.error)})
        </AlertDescription>
      </Alert>
    );
  }

  const members = (q.data ?? []).filter(
    (t: Treasury) => t.isMember && !t.isHidden,
  );

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card py-8 text-center">
        <p className="text-sm font-medium">No memberships</p>
        <p className="mt-1 text-xs text-muted-foreground break-all">
          <span className="font-mono">{accountId}</span> is not listed as a
          member of any Sputnik DAO tracked by api.trezu.app.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {members.map((t: Treasury) => {
        const body = (
          <>
            <TreasuryLogo t={t} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {t.config.name}
              </div>
              <div className="truncate text-[11px] text-muted-foreground font-mono">
                {t.daoId}
              </div>
            </div>
            {t.isConfidential && (
              <Badge variant="outline" className="text-[10px]">
                Confidential
              </Badge>
            )}
          </>
        );
        return onPick ? (
          <button
            key={t.daoId}
            type="button"
            onClick={() => onPick(t.daoId)}
            className="flex w-full items-center gap-3 rounded-md border bg-background px-3 py-2 text-left hover:bg-muted/60 transition-colors"
          >
            {body}
          </button>
        ) : (
          <Link
            key={t.daoId}
            href={`/${t.daoId}`}
            className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 hover:bg-muted/60 transition-colors"
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}
