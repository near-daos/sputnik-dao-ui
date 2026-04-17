"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useConnectedAccount } from "react-near-ts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalCard } from "@/components/ProposalCard";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { useProposal, usePolicy } from "@/hooks/useDao";

export default function ProposalDetailPage() {
  const params = useParams<{ daoId: string; proposalId: string }>();
  const daoId = decodeURIComponent(params.daoId ?? "");
  const proposalIdRaw = decodeURIComponent(params.proposalId ?? "");

  const account = useConnectedAccount();
  const connectedAccountId = account.isConnectedAccount
    ? account.connectedAccountId
    : null;

  const proposalId = Number.parseInt(proposalIdRaw, 10);
  const validId = Number.isFinite(proposalId) && proposalId >= 0;

  const proposalQ = useProposal(daoId, validId ? proposalId : -1);
  const policyQ = usePolicy(daoId);
  const policy = policyQ.data?.result ?? null;

  const proposal = proposalQ.data?.result;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 w-full">
      <SiteHeader daoId={daoId} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8 space-y-4">
        <nav className="text-xs text-muted-foreground">
          <Link href={`/${daoId}`} className="hover:underline">
            ← All proposals
          </Link>
        </nav>

        {!validId && (
          <Alert variant="destructive">
            <AlertDescription>
              Invalid proposal id: <code>{proposalIdRaw}</code>
            </AlertDescription>
          </Alert>
        )}

        {validId && proposalQ.isLoading && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        )}

        {validId && proposalQ.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Could not load proposal #{proposalId}. It may not exist or the
              DAO account id is wrong.
            </AlertDescription>
          </Alert>
        )}

        {proposal && (
          <ProposalCard
            daoId={daoId}
            proposal={proposal}
            connectedAccount={connectedAccountId}
            policy={policy}
            detailed
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
