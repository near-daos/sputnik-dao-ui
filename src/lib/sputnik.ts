import * as z from "zod/mini";

export const ProposalStatusSchema = z.enum([
  "InProgress",
  "Approved",
  "Rejected",
  "Removed",
  "Expired",
  "Moved",
  "Failed",
]);

export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const VoteSchema = z.enum(["Approve", "Reject", "Remove"]);
export type VoteValue = z.infer<typeof VoteSchema>;

const VoteCountValueSchema = z.array(z.union([z.string(), z.number()]));

export const ProposalSchema = z.object({
  id: z.number(),
  proposer: z.string(),
  description: z.string(),
  kind: z.any(),
  status: ProposalStatusSchema,
  vote_counts: z.record(z.string(), VoteCountValueSchema),
  votes: z.record(z.string(), VoteSchema),
  submission_time: z.string(),
});

export type Proposal = z.infer<typeof ProposalSchema>;

export const ProposalListSchema = z.array(ProposalSchema);

export const RoleKindSchema = z.union([
  z.literal("Everyone"),
  z.object({ Member: z.string() }),
  z.object({ Group: z.array(z.string()) }),
]);

export const RolePermissionSchema = z.object({
  name: z.string(),
  kind: RoleKindSchema,
  permissions: z.array(z.string()),
  vote_policy: z.record(z.string(), z.any()),
});

export const ConfigSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  metadata: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const PolicySchema = z.object({
  roles: z.array(RolePermissionSchema),
  default_vote_policy: z.any(),
  proposal_bond: z.string(),
  proposal_period: z.string(),
  bounty_bond: z.string(),
  bounty_forgiveness_period: z.string(),
});

export type Policy = z.infer<typeof PolicySchema>;

export function proposalKindLabel(kind: unknown): string {
  if (!kind) return "Unknown";
  if (typeof kind === "string") return kind;
  if (typeof kind === "object") {
    const keys = Object.keys(kind as Record<string, unknown>);
    return keys[0] ?? "Unknown";
  }
  return String(kind);
}

/**
 * Proposals on-chain remain `InProgress` until someone calls `Finalize` or
 * a quorum is reached. Once `submission_time + policy.proposal_period` is in
 * the past, the proposal is effectively expired — vote actions will fail and
 * the UI should say so. Returns null if we can't evaluate (policy not loaded).
 */
export function proposalDeadlineNs(
  proposal: Proposal,
  policy: Policy | null,
): bigint | null {
  if (!policy) return null;
  try {
    return BigInt(proposal.submission_time) + BigInt(policy.proposal_period);
  } catch {
    return null;
  }
}

export function isProposalPastDeadline(
  proposal: Proposal,
  policy: Policy | null,
  nowMs: number = Date.now(),
): boolean {
  const deadline = proposalDeadlineNs(proposal, policy);
  if (deadline === null) return false;
  const nowNs = BigInt(nowMs) * BigInt(1_000_000);
  return nowNs > deadline;
}

/**
 * Returns the status the UI should present. Mirrors the contract's own
 * `Policy::proposal_status` logic: an `InProgress` proposal whose voting
 * period has elapsed is "Expired" in every user-visible sense — even if the
 * on-chain status hasn't flipped yet because no one has called `Finalize`.
 */
export function effectiveProposalStatus(
  proposal: Proposal,
  policy: Policy | null,
  nowMs: number = Date.now(),
): ProposalStatus {
  if (
    proposal.status === "InProgress" &&
    isProposalPastDeadline(proposal, policy, nowMs)
  ) {
    return "Expired";
  }
  return proposal.status;
}

export function getUserRoles(policy: Policy, accountId: string): string[] {
  const roles: string[] = [];
  for (const role of policy.roles) {
    if (role.kind === "Everyone") {
      roles.push(role.name);
    } else if (typeof role.kind === "object" && "Group" in role.kind) {
      if (role.kind.Group.includes(accountId)) roles.push(role.name);
    }
  }
  return roles;
}

// Map a ProposalKind JSON variant to the policy label the contract uses in
// permission strings (matches ProposalKind::to_policy_label in sputnikdao2).
const POLICY_LABELS: Record<string, string> = {
  ChangeConfig: "config",
  ChangePolicy: "policy",
  AddMemberToRole: "add_member_to_role",
  RemoveMemberFromRole: "remove_member_from_role",
  FunctionCall: "call",
  UpgradeSelf: "upgrade_self",
  UpgradeRemote: "upgrade_remote",
  Transfer: "transfer",
  SetStakingContract: "set_vote_token",
  AddBounty: "add_bounty",
  BountyDone: "bounty_done",
  Vote: "vote",
  FactoryInfoUpdate: "factory_info_update",
  ChangePolicyAddOrUpdateRole: "policy_add_or_update_role",
  ChangePolicyRemoveRole: "policy_remove_role",
  ChangePolicyUpdateDefaultVotePolicy: "policy_update_default_vote_policy",
  ChangePolicyUpdateParameters: "policy_update_parameters",
};

export function proposalKindPolicyLabel(kind: unknown): string | null {
  const variant = proposalKindLabel(kind);
  return POLICY_LABELS[variant] ?? null;
}

function roleMatchesUser(
  role: Policy["roles"][number],
  accountId: string,
): boolean {
  if (role.kind === "Everyone") return true;
  if (typeof role.kind === "object" && "Group" in role.kind) {
    return role.kind.Group.includes(accountId);
  }
  // Member (balance-weighted) — we can't evaluate without reading the
  // staking contract, so be conservative and treat as no-match.
  return false;
}

function roleAllows(
  role: Policy["roles"][number],
  kindLabel: string,
  action: string,
): boolean {
  const p = role.permissions;
  return (
    p.includes(`${kindLabel}:${action}`) ||
    p.includes(`${kindLabel}:*`) ||
    p.includes(`*:${action}`) ||
    p.includes("*:*")
  );
}

export type PolicyAction =
  | "AddProposal"
  | "VoteApprove"
  | "VoteReject"
  | "VoteRemove";

export function canActOnProposalKind(
  policy: Policy,
  accountId: string | null,
  kind: unknown,
  action: PolicyAction,
): boolean {
  if (!accountId) return false;
  const kindLabel = proposalKindPolicyLabel(kind);
  if (!kindLabel) return false;
  return policy.roles.some(
    (role) =>
      roleMatchesUser(role, accountId) && roleAllows(role, kindLabel, action),
  );
}

export function canAddAnyProposal(
  policy: Policy,
  accountId: string | null,
): boolean {
  if (!accountId) return false;
  return policy.roles.some((role) => {
    if (!roleMatchesUser(role, accountId)) return false;
    return role.permissions.some(
      (p) =>
        p === "*:*" ||
        p === "*:AddProposal" ||
        p.endsWith(":AddProposal") ||
        p.endsWith(":*"),
    );
  });
}
