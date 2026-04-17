"use client";

import {
  type DeserializeResultFnArgs,
  type JsonValue,
  fromJsonBytes,
  useContractReadFunction,
  useExecuteTransaction,
  functionCall,
} from "react-near-ts";
import {
  ProposalListSchema,
  ProposalSchema,
  PolicySchema,
  ConfigSchema,
  type Proposal,
  type Policy,
  type Config,
} from "@/lib/sputnik";

const deserializeU64 = (args: DeserializeResultFnArgs): number => {
  const raw = fromJsonBytes(args.rawResult);
  return typeof raw === "number" ? raw : Number(raw);
};

const deserializeProposals = (args: DeserializeResultFnArgs): Proposal[] => {
  return ProposalListSchema.parse(fromJsonBytes(args.rawResult));
};

const deserializeProposal = (args: DeserializeResultFnArgs): Proposal => {
  return ProposalSchema.parse(fromJsonBytes(args.rawResult));
};

const deserializePolicy = (args: DeserializeResultFnArgs): Policy => {
  return PolicySchema.parse(fromJsonBytes(args.rawResult));
};

const deserializeConfig = (args: DeserializeResultFnArgs): Config => {
  return ConfigSchema.parse(fromJsonBytes(args.rawResult));
};

export function useLastProposalId(daoId: string) {
  return useContractReadFunction({
    contractAccountId: daoId,
    functionName: "get_last_proposal_id",
    functionArgs: {},
    options: { deserializeResult: deserializeU64 },
    query: { enabled: daoId.length > 0 },
  });
}

export function useProposals(daoId: string, fromIndex: number, limit: number) {
  return useContractReadFunction({
    contractAccountId: daoId,
    functionName: "get_proposals",
    functionArgs: { from_index: fromIndex, limit },
    options: { deserializeResult: deserializeProposals },
    query: { enabled: daoId.length > 0 && limit > 0 },
  });
}

export function useProposal(daoId: string, proposalId: number) {
  return useContractReadFunction({
    contractAccountId: daoId,
    functionName: "get_proposal",
    functionArgs: { id: proposalId },
    options: { deserializeResult: deserializeProposal },
    query: { enabled: daoId.length > 0 && Number.isFinite(proposalId) && proposalId >= 0 },
  });
}

export function usePolicy(daoId: string) {
  return useContractReadFunction({
    contractAccountId: daoId,
    functionName: "get_policy",
    functionArgs: {},
    options: { deserializeResult: deserializePolicy },
    query: { enabled: daoId.length > 0 },
  });
}

export function useConfig(daoId: string) {
  return useContractReadFunction({
    contractAccountId: daoId,
    functionName: "get_config",
    functionArgs: {},
    options: { deserializeResult: deserializeConfig },
    query: { enabled: daoId.length > 0 },
  });
}

export function useActProposal(daoId: string) {
  const mutation = useExecuteTransaction();

  const act = (
    proposalId: number,
    action: "VoteApprove" | "VoteReject" | "VoteRemove",
    kind: unknown,
  ) => {
    mutation.executeTransaction({
      intent: {
        action: functionCall({
          functionName: "act_proposal",
          functionArgs: {
            id: proposalId,
            action,
            proposal: kind as JsonValue,
          },
          gasLimit: { teraGas: "200" },
        }),
        receiverAccountId: daoId,
      },
      mutate: {
        onSuccess: (_d, _v, _m, context) => {
          void context.client.invalidateQueries({
            queryKey: ["callContractReadFunction", daoId],
          });
        },
      },
    });
  };

  return { act, ...mutation };
}

export function useAddProposal(daoId: string) {
  const mutation = useExecuteTransaction();

  const submit = (
    description: string,
    kind: unknown,
    proposalBondYocto: string,
  ) => {
    mutation.executeTransaction({
      intent: {
        action: functionCall({
          functionName: "add_proposal",
          functionArgs: {
            proposal: { description, kind: kind as JsonValue },
          },
          gasLimit: { teraGas: "100" },
          attachedDeposit: { yoctoNear: proposalBondYocto },
        }),
        receiverAccountId: daoId,
      },
      mutate: {
        onSuccess: (_d, _v, _m, context) => {
          void context.client.invalidateQueries({
            queryKey: ["callContractReadFunction", daoId],
          });
        },
      },
    });
  };

  return { submit, ...mutation };
}
