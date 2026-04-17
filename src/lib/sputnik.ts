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
