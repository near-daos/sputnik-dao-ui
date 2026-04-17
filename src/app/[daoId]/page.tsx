"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useConnectedAccount } from "react-near-ts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalList } from "@/components/ProposalList";
import { CreateProposal } from "@/components/CreateProposal";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { usePolicy } from "@/hooks/useDao";
import { getUserRoles } from "@/lib/sputnik";
import { addRecentDao } from "@/lib/recentDaos";

export default function DaoPage() {
  const { daoId: rawDaoId } = useParams<{ daoId: string }>();
  const daoId = decodeURIComponent(rawDaoId ?? "");

  useEffect(() => {
    if (daoId) addRecentDao(daoId);
  }, [daoId]);

  const account = useConnectedAccount();

  const connectedAccountId = account.isConnectedAccount
    ? account.connectedAccountId
    : null;

  const policyQ = usePolicy(daoId);
  const policy = policyQ.data?.result;

  const userRoles = connectedAccountId && policy
    ? getUserRoles(policy, connectedAccountId)
    : [];

  const isMember =
    connectedAccountId !== null &&
    userRoles.some((r) => r !== "all" && r.toLowerCase() !== "everyone");

  const canVote = connectedAccountId !== null && userRoles.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 w-full">
      <SiteHeader daoId={daoId} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8 space-y-4">
        {policyQ.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {policyQ.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load DAO policy. Is the contract account id correct?
            </AlertDescription>
          </Alert>
        )}

        {policy && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-4">
            <div className="text-sm">
              {connectedAccountId ? (
                canVote ? (
                  <>
                    Signed in as{" "}
                    <span className="font-medium">{connectedAccountId}</span> ·
                    roles:{" "}
                    <span className="font-medium">
                      {userRoles.join(", ") || "none"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{connectedAccountId}</span>{" "}
                    is not a member of this DAO. You can view proposals but
                    cannot vote.
                  </>
                )
              ) : (
                <>Connect a wallet that is a member of this DAO to vote.</>
              )}
            </div>

            {connectedAccountId && isMember && (
              <CreateProposal
                daoId={daoId}
                proposalBondYocto={policy.proposal_bond}
                policy={policy}
              />
            )}
          </div>
        )}

        <ProposalList
          daoId={daoId}
          connectedAccount={connectedAccountId}
          canVote={canVote}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
