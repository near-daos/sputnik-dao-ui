import type { Config, Policy } from "@/lib/sputnik";

export type KindTemplateId =
  | "Vote"
  | "Transfer"
  | "FunctionCall"
  | "AddMemberToRole"
  | "RemoveMemberFromRole"
  | "ChangeConfig"
  | "ChangePolicy"
  | "ChangePolicyAddOrUpdateRole"
  | "ChangePolicyRemoveRole"
  | "ChangePolicyUpdateDefaultVotePolicy"
  | "ChangePolicyUpdateParameters"
  | "SetStakingContract"
  | "UpgradeSelf"
  | "UpgradeRemote"
  | "AddBounty"
  | "BountyDone"
  | "FactoryInfoUpdate";

export interface KindTemplate {
  id: KindTemplateId;
  label: string;
  group: "common" | "members" | "policy" | "advanced";
  description: string;
  kind: unknown;
}

const ONE_NEAR_YOCTO = "1000000000000000000000000";
const ONE_WEEK_NS = "604800000000000";
const ONE_DAY_NS = "86400000000000";
const HUNDRED_TGAS = "100000000000000";
const ZERO_HASH = "11111111111111111111111111111111";

export interface TemplateContext {
  daoId: string;
  policy: Policy | null;
  config: Config | null;
}

export function getTemplates(ctx: TemplateContext): KindTemplate[] {
  const { daoId, policy, config } = ctx;

  const currentConfig: Config = config ?? {
    name: "DAO name",
    purpose: "DAO purpose",
    metadata: "",
  };

  const currentPolicy = policy ?? {
    roles: [
      {
        name: "council",
        kind: { Group: ["alice.near"] },
        permissions: ["*:*"],
        vote_policy: {},
      },
    ],
    default_vote_policy: {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: [1, 2],
    },
    proposal_bond: ONE_NEAR_YOCTO,
    proposal_period: ONE_WEEK_NS,
    bounty_bond: ONE_NEAR_YOCTO,
    bounty_forgiveness_period: ONE_DAY_NS,
  };

  const firstGroupRoleName =
    policy?.roles.find(
      (r) => typeof r.kind === "object" && r.kind !== null && "Group" in r.kind,
    )?.name ?? "council";

  return [
    {
      id: "Vote",
      label: "Vote — signaling only",
      group: "common",
      description: "Signaling vote (no on-chain action)",
      kind: "Vote",
    },
    {
      id: "Transfer",
      label: "Transfer — send NEAR or a fungible token",
      group: "common",
      description: `Transfer 1 NEAR from ${daoId} to recipient`,
      kind: {
        Transfer: {
          token_id: "",
          receiver_id: "recipient.near",
          amount: ONE_NEAR_YOCTO,
          msg: null,
        },
      },
    },
    {
      id: "FunctionCall",
      label: "Function call — call another contract",
      group: "common",
      description: "Call an external contract method",
      kind: {
        FunctionCall: {
          receiver_id: "example.near",
          actions: [
            {
              method_name: "method_name",
              args: btoa(JSON.stringify({ key: "value" })),
              deposit: "0",
              gas: HUNDRED_TGAS,
            },
          ],
        },
      },
    },
    {
      id: "AddMemberToRole",
      label: "Add member to role",
      group: "members",
      description: `Add alice.near to "${firstGroupRoleName}"`,
      kind: {
        AddMemberToRole: {
          member_id: "alice.near",
          role: firstGroupRoleName,
        },
      },
    },
    {
      id: "RemoveMemberFromRole",
      label: "Remove member from role",
      group: "members",
      description: `Remove alice.near from "${firstGroupRoleName}"`,
      kind: {
        RemoveMemberFromRole: {
          member_id: "alice.near",
          role: firstGroupRoleName,
        },
      },
    },
    {
      id: "ChangeConfig",
      label: "Change config — name / purpose / metadata",
      group: "policy",
      description: "Update DAO name, purpose, or metadata",
      kind: {
        ChangeConfig: { config: currentConfig },
      },
    },
    {
      id: "ChangePolicy",
      label: "Change full policy",
      group: "policy",
      description: "Replace the entire DAO policy (roles and vote rules)",
      kind: {
        ChangePolicy: { policy: { Current: currentPolicy } },
      },
    },
    {
      id: "ChangePolicyAddOrUpdateRole",
      label: "Add or update role",
      group: "policy",
      description: "Add a new role or update an existing one",
      kind: {
        ChangePolicyAddOrUpdateRole: {
          role: {
            name: "new-role",
            kind: { Group: ["alice.near"] },
            permissions: [
              "*:AddProposal",
              "*:VoteApprove",
              "*:VoteReject",
              "*:VoteRemove",
            ],
            vote_policy: {},
          },
        },
      },
    },
    {
      id: "ChangePolicyRemoveRole",
      label: "Remove role",
      group: "policy",
      description: `Remove role "${firstGroupRoleName}"`,
      kind: {
        ChangePolicyRemoveRole: { role: firstGroupRoleName },
      },
    },
    {
      id: "ChangePolicyUpdateDefaultVotePolicy",
      label: "Update default vote policy",
      group: "policy",
      description: "Change the fallback vote policy for unspecified kinds",
      kind: {
        ChangePolicyUpdateDefaultVotePolicy: {
          vote_policy: currentPolicy.default_vote_policy,
        },
      },
    },
    {
      id: "ChangePolicyUpdateParameters",
      label: "Update policy parameters",
      group: "policy",
      description: "Tweak bond and period fields on the existing policy",
      kind: {
        ChangePolicyUpdateParameters: {
          parameters: {
            proposal_bond: currentPolicy.proposal_bond,
            proposal_period: currentPolicy.proposal_period,
            bounty_bond: currentPolicy.bounty_bond,
            bounty_forgiveness_period: currentPolicy.bounty_forgiveness_period,
          },
        },
      },
    },
    {
      id: "SetStakingContract",
      label: "Set staking contract (one-time)",
      group: "advanced",
      description: "Register a staking contract (can only be set once)",
      kind: {
        SetStakingContract: { staking_id: "staking.example.near" },
      },
    },
    {
      id: "UpgradeSelf",
      label: "Upgrade self — deploy new code from blob",
      group: "advanced",
      description: "Deploy stored blob as the DAO's own code",
      kind: {
        UpgradeSelf: { hash: ZERO_HASH },
      },
    },
    {
      id: "UpgradeRemote",
      label: "Upgrade remote contract",
      group: "advanced",
      description: "Ship a stored blob as code for another contract",
      kind: {
        UpgradeRemote: {
          receiver_id: "target.near",
          method_name: "upgrade",
          hash: ZERO_HASH,
        },
      },
    },
    {
      id: "AddBounty",
      label: "Add bounty",
      group: "advanced",
      description: "Create a new bounty",
      kind: {
        AddBounty: {
          bounty: {
            description: "Bounty description",
            token: "",
            amount: ONE_NEAR_YOCTO,
            times: 1,
            max_deadline: ONE_WEEK_NS,
          },
        },
      },
    },
    {
      id: "BountyDone",
      label: "Bounty done — pay out a claim",
      group: "advanced",
      description: "Mark a bounty claim as done and pay out",
      kind: {
        BountyDone: {
          bounty_id: 0,
          receiver_id: "claimer.near",
        },
      },
    },
    {
      id: "FactoryInfoUpdate",
      label: "Factory info update",
      group: "advanced",
      description: "Change the parent factory and auto-update flag",
      kind: {
        FactoryInfoUpdate: {
          factory_info: {
            factory_id: "sputnik-dao.near",
            auto_update: true,
          },
        },
      },
    },
  ];
}

export const GROUP_LABELS: Record<KindTemplate["group"], string> = {
  common: "Common",
  members: "Members",
  policy: "Config & policy",
  advanced: "Advanced",
};
