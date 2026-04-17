"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useActProposal } from "@/hooks/useDao";
import {
  canActOnProposalKind,
  proposalKindLabel,
  type Policy,
  type Proposal,
  type ProposalStatus,
  type VoteValue,
} from "@/lib/sputnik";
import { formatTimestampNs, shortenAccount } from "@/lib/near";
import { ProposalDescription } from "@/components/ProposalDescription";
import { ActionButton } from "@/components/ActionButton";

export function StatusBadge({ status }: { status: ProposalStatus }) {
  switch (status) {
    case "InProgress":
      return (
        <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 hover:bg-blue-500/15 dark:text-blue-400">
          In progress
        </Badge>
      );
    case "Approved":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15 dark:text-emerald-400">
          Approved
        </Badge>
      );
    case "Rejected":
      return <Badge variant="secondary">Rejected</Badge>;
    case "Removed":
      return <Badge variant="destructive">Removed</Badge>;
    case "Expired":
      return <Badge variant="outline">Expired</Badge>;
    case "Failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "Moved":
      return <Badge variant="secondary">Moved</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function voteTotals(proposal: Proposal): {
  approve: number;
  reject: number;
  remove: number;
} {
  let approve = 0;
  let reject = 0;
  let remove = 0;
  for (const vote of Object.values(proposal.votes) as VoteValue[]) {
    if (vote === "Approve") approve += 1;
    else if (vote === "Reject") reject += 1;
    else if (vote === "Remove") remove += 1;
  }
  return { approve, reject, remove };
}

export function ProposalCard({
  daoId,
  proposal,
  connectedAccount,
  policy,
  detailed = false,
  linkToDetail = false,
}: {
  daoId: string;
  proposal: Proposal;
  connectedAccount: string | null;
  policy: Policy | null;
  detailed?: boolean;
  linkToDetail?: boolean;
}) {
  const act = useActProposal(daoId);
  const [busy, setBusy] = useState(false);

  const onVote = (action: "VoteApprove" | "VoteReject") => {
    setBusy(true);
    act.act(proposal.id, action, proposal.kind);
  };

  const totals = voteTotals(proposal);
  const myVote = connectedAccount ? proposal.votes[connectedAccount] : null;
  const kindName = proposalKindLabel(proposal.kind);
  const isInProgress = proposal.status === "InProgress";

  type VoteButtonState =
    | { kind: "hidden" }
    | { kind: "enabled" }
    | { kind: "disabled"; tooltip: string };

  const voteButtonState = (action: "VoteApprove" | "VoteReject"): VoteButtonState => {
    if (myVote) return { kind: "hidden" };
    if (!isInProgress) {
      return {
        kind: "disabled",
        tooltip: `Voting is closed — this proposal is ${proposal.status}.`,
      };
    }
    if (!connectedAccount) {
      return {
        kind: "disabled",
        tooltip: "Connect your wallet to vote on this proposal.",
      };
    }
    if (!policy) {
      return { kind: "disabled", tooltip: "Loading DAO policy…" };
    }
    const allowed = canActOnProposalKind(
      policy,
      connectedAccount,
      proposal.kind,
      action,
    );
    if (!allowed) {
      const verb = action === "VoteApprove" ? "approve" : "reject";
      return {
        kind: "disabled",
        tooltip: `Your account isn't in a role with permission to ${verb} ${kindName} proposals in this DAO. Sign in as a voting member to enable this action.`,
      };
    }
    return { kind: "enabled" };
  };

  const approveState = voteButtonState("VoteApprove");
  const rejectState = voteButtonState("VoteReject");
  const showVoteButtons =
    approveState.kind !== "hidden" || rejectState.kind !== "hidden";

  const idLabel = (
    <span className="text-sm font-medium">#{proposal.id}</span>
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {linkToDetail ? (
                <Link
                  href={`/${daoId}/${proposal.id}`}
                  className="hover:underline"
                >
                  {idLabel}
                </Link>
              ) : (
                idLabel
              )}
              <Badge variant="outline" className="text-[10px]">
                {kindName}
              </Badge>
              <StatusBadge status={proposal.status} />
            </div>
            <p className="text-xs text-muted-foreground break-all">
              by{" "}
              <span className="font-medium">
                {detailed ? proposal.proposer : shortenAccount(proposal.proposer)}
              </span>{" "}
              · {formatTimestampNs(proposal.submission_time)}
            </p>
          </div>
        </div>

        {proposal.description && (
          <ProposalDescription text={proposal.description} daoId={daoId} />
        )}

        {detailed ? (
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-muted-foreground">Kind</p>
            <pre className="max-h-[32rem] overflow-auto rounded-md border bg-muted/30 p-2 text-[11px] leading-snug">
              {JSON.stringify(proposal.kind, null, 2)}
            </pre>
          </div>
        ) : (
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Details
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-muted/30 p-2 text-[11px] leading-snug">
              {JSON.stringify(proposal.kind, null, 2)}
            </pre>
          </details>
        )}

        {detailed && Object.keys(proposal.votes).length > 0 && (
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-muted-foreground">
              Votes ({Object.keys(proposal.votes).length})
            </p>
            <div className="rounded-md border bg-muted/20 divide-y">
              {Object.entries(proposal.votes).map(([voter, vote]) => (
                <div
                  key={voter}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                >
                  <span className="break-all font-mono">{voter}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {vote}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              Approve {totals.approve}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Reject {totals.reject}
            </Badge>
            {totals.remove > 0 && (
              <Badge variant="outline" className="text-[10px]">
                Remove {totals.remove}
              </Badge>
            )}
            {myVote && (
              <span>
                — you voted <span className="font-medium">{myVote}</span>
              </span>
            )}
          </div>

          {showVoteButtons && (
            <div className="flex gap-2">
              {approveState.kind !== "hidden" && (
                <ActionButton
                  onClick={() => onVote("VoteApprove")}
                  disabled={
                    approveState.kind === "disabled" ||
                    (act.isPending && busy)
                  }
                  disabledTooltip={
                    approveState.kind === "disabled"
                      ? approveState.tooltip
                      : null
                  }
                >
                  Approve
                </ActionButton>
              )}
              {rejectState.kind !== "hidden" && (
                <ActionButton
                  onClick={() => onVote("VoteReject")}
                  disabled={
                    rejectState.kind === "disabled" ||
                    (act.isPending && busy)
                  }
                  disabledTooltip={
                    rejectState.kind === "disabled"
                      ? rejectState.tooltip
                      : null
                  }
                >
                  Reject
                </ActionButton>
              )}
            </div>
          )}
        </div>

        {act.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Vote failed: {act.error ? String(act.error) : "unknown error"}
            </AlertDescription>
          </Alert>
        )}
        {act.isSuccess && (
          <Alert>
            <AlertDescription>Vote submitted successfully.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
