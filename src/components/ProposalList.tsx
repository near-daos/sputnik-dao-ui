"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProposals, useLastProposalId } from "@/hooks/useDao";
import { ProposalCard } from "@/components/ProposalCard";

const PAGE_SIZE = 25;

function ProposalRowSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

export function ProposalList({
  daoId,
  connectedAccount,
  canVote,
}: {
  daoId: string;
  connectedAccount: string | null;
  canVote: boolean;
}) {
  const [pageStart, setPageStart] = useState(0);

  const lastIdQ = useLastProposalId(daoId);
  const lastId = lastIdQ.data?.result ?? 0;

  const fromIndex = useMemo(() => {
    if (lastId <= 0) return 0;
    const end = Math.max(0, lastId - pageStart);
    return Math.max(0, end - PAGE_SIZE);
  }, [lastId, pageStart]);

  const proposalsQ = useProposals(daoId, fromIndex, PAGE_SIZE);

  const proposals = [...(proposalsQ.data?.result ?? [])].sort(
    (a, b) => b.id - a.id,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-muted-foreground">
          Proposals{lastIdQ.data ? ` (${lastId} total)` : ""}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pageStart + PAGE_SIZE >= lastId}
            onClick={() => setPageStart((s) => s + PAGE_SIZE)}
          >
            Older
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pageStart === 0}
            onClick={() => setPageStart((s) => Math.max(0, s - PAGE_SIZE))}
          >
            Newer
          </Button>
        </div>
      </div>

      {lastIdQ.isLoading || proposalsQ.isLoading ? (
        <div className="space-y-3">
          <ProposalRowSkeleton />
          <ProposalRowSkeleton />
          <ProposalRowSkeleton />
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card py-10 text-center">
          <p className="text-sm font-medium">No proposals</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This DAO does not have any proposals yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              daoId={daoId}
              proposal={p}
              connectedAccount={connectedAccount}
              canVote={canVote}
              linkToDetail
            />
          ))}
        </div>
      )}
    </div>
  );
}
