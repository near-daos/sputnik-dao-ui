<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Technical reference for AI agents

This document is the primary orientation guide for any AI agent working on this repo. Read it end-to-end before making changes — it encodes non-obvious invariants about the Sputnik DAO contract, the libraries this app uses, and the pitfalls that have already been worked through.

---

## 1. What this app is

A Next.js 16 (App Router) single-page dApp for managing a [Sputnik DAO](https://github.com/near-daos/sputnik-dao-contract) on NEAR mainnet:

1. Sign in with any NEAR-compatible wallet.
2. Enter any DAO contract account id (e.g. `testing-astradao.sputnik-dao.near`).
3. See every proposal (newest first), open a proposal detail page, vote Approve/Reject, or create a new proposal of any `ProposalKind` using a template picker.

Role-awareness (member vs. non-member, vote eligibility) is derived client-side from `get_policy`. The app never holds private keys — every write is a `useExecuteTransaction` that the user's wallet signs.

---

## 2. How the Sputnik DAO contract works (the parts this app touches)

Canonical source: https://github.com/near-daos/sputnik-dao-contract/tree/main/sputnikdao2

### 2.1 Contract versions

v2 and v3 are in the wild on mainnet. Both expose the same core view/change methods this UI uses (`get_last_proposal_id`, `get_proposals`, `get_proposal`, `get_policy`, `get_config`, `add_proposal`, `act_proposal`). v3 adds `get_factory_info` and `delegation_balance_ratio`; we don't depend on those.

Check the deployed version with `version()`. The `testing-astradao.sputnik-dao.near` reference DAO returns `"2.0.0"`.

### 2.2 Pagination semantics

`get_proposals(from_index: u64, limit: u64) -> Vec<ProposalOutput>` iterates the range `from_index..min(last_proposal_id, from_index + limit)` and `filter_map`s against a sparse `LookupMap`. If proposals in that range were removed, the response has fewer than `limit` entries — **do not infer "end of list" from the returned length**. Compute `from_index` from `get_last_proposal_id()` minus page offset, and sort client-side.

See `src/components/ProposalList.tsx` — `pageStart` is a cumulative offset, not an index; `fromIndex` is `max(0, lastId - pageStart - PAGE_SIZE)`.

### 2.3 `add_proposal` bond

```rust
assert_eq!(env::attached_deposit(), policy.proposal_bond, "ERR_MIN_BOND");
```

The attached deposit must equal `policy.proposal_bond` **exactly**. The UI reads it via `usePolicy` and passes it verbatim as `{ yoctoNear: policy.proposal_bond }`. Never hardcode, round, or add a "safety margin" — the contract rejects both over- and under-payment.

### 2.4 `act_proposal` quirks

- Actions of interest: `VoteApprove`, `VoteReject`, `VoteRemove`.
- Permissions are checked per-role against `<proposal_kind_label>:<action_label>` entries in the policy.
- A yes vote that tips the proposal over quorum runs the proposal's payload (transfer, FunctionCall chain, etc.) **in the same receipt**. Budget gas accordingly: the UI uses **200 TGas** for voting.
- `ERR_ALREADY_VOTED` if the same account voted twice. The UI hides the vote buttons when `proposal.votes[connectedAccount]` exists.
- Newer contract source (v2.3.1+) adds a `proposal: ProposalKind` argument and `#[deny_unknown_arguments]`. The UI sends it; older contracts that use standard serde silently ignore extra fields.

### 2.5 `ProposalKind` enum

17 variants. Each one is represented in `src/lib/proposalTemplates.ts`. Notable encoding details:

- **`"Vote"`** is a bare string (the unit variant), not an object. The template handles this.
- **`ChangePolicy`** wraps the policy in a `VersionedPolicy` envelope: `{"ChangePolicy": {"policy": {"Current": { ...Policy }}}}`.
- **`Transfer`**: `token_id: ""` means native NEAR (legacy convention from near-sdk v3). Any other value is a NEP-141 contract id. `amount` is a `U128` string in yoctoNEAR or the token's base unit. `msg: null` means `ft_transfer`, a string means `ft_transfer_call`.
- **`FunctionCall`**: the inner `args` is a **base64-encoded** JSON string, not a nested object. `deposit` is yoctoNEAR as `U128` string. `gas` is gas units (1 TGas = `"1000000000000"`).
- **`UpgradeSelf` / `UpgradeRemote`**: `hash` is a base58 CryptoHash of a blob previously stored via `store_blob` — the 32-one-character placeholder in the template is a reminder, not a valid value.

### 2.6 JSON field types from the contract

- `U128`, `U64` → JSON strings on recent contracts. **Older deployed v2 contracts emit some of these as plain numbers** (notably `vote_counts`). Zod schemas in this app use `z.union([z.string(), z.number()])` for those fields. If you add a new schema and parses silently fail against mainnet DAOs, this is almost always the cause.
- `AccountId` → string.
- `Base58CryptoHash` → string.
- `Base64VecU8` → string (base64-encoded bytes).
- Unit enum variants → bare strings (`"Vote"`, `"Approve"`).
- Non-unit enum variants → single-key objects (`{"Transfer": {...}}`).
- `ProposalOutput` flattens `id` into the proposal: `{ id, proposer, description, kind, ... }`.

---

## 3. Libraries and their quirks

### 3.1 `react-near-ts`

Provides `NearProvider`, `useConnectedAccount`, `useNearSignIn/SignOut`, `useContractReadFunction`, `useExecuteTransaction`, and re-exports from `near-api-ts` (`functionCall`, `fromJsonBytes`, `JsonValue`, `DeserializeResultFnArgs`, `createMainnetClient/TestnetClient`).

- **`NearProvider` ships its own `QueryClientProvider`.** Do not add another one. Custom `useQuery` calls share that same client automatically, which is exactly what we want for cross-invalidation.
- **Query key for reads** is `["callContractReadFunction", contractAccountId, functionName]`. TanStack matches keys by prefix, so `["callContractReadFunction", daoId]` invalidates **all** reads against a DAO at once. After every `add_proposal` / `act_proposal` success we invalidate by that two-element prefix.
- `useContractReadFunction` returns `{ data: { result, rawResult, blockHash, blockHeight, logs } }`. Access data with `.data?.result`, never `.data?.<field>`.
- `useExecuteTransaction()` returns `{ executeTransaction, isPending, isSuccess, isError, error, data }`. The mutation's `intent` shape is `{ action: FunctionCallAction, receiverAccountId }`. The `action` is built with `functionCall({ functionName, functionArgs, gasLimit, attachedDeposit? })`. **Field name is `attachedDeposit`, not `deposit`.**
- `functionArgs` is typed `MaybeJsonValue`. User-supplied payloads that are `unknown` (e.g. `JSON.parse(textarea)`) need a `as JsonValue` cast at the boundary. See `useActProposal` / `useAddProposal` in `src/hooks/useDao.ts`.

### 3.2 Zod (`zod/mini`)

`react-near-ts` peer-depends on `zod@^4`. This app imports from `zod/mini` to keep bundles small. The schemas live in `src/lib/sputnik.ts`. When adding fields, prefer lenient unions for numeric-ish fields (see §2.6).

### 3.3 shadcn/ui + Tailwind v4

- Olive `base-luma` preset. CSS variables are in `src/app/globals.css`; the `@theme inline` block wires them into Tailwind.
- Font CSS variables must be `--font-sans` / `--font-mono` in `layout.tsx`. `create-next-app`'s default (`--font-geist-sans`/`--font-geist-mono`) will silently fall back to the system stack.
- Components under `src/components/ui/` are generated — do not hand-edit them. Re-run `pnpm dlx shadcn@latest add <component>` and commit the regenerated file.
- Badges use soft tinted variants (`bg-emerald-500/15 text-emerald-700 dark:text-emerald-400`), never hardcoded colors.

### 3.4 Next.js 16 / React 19

- **Params are Promises** in the server-component signature. In client components, use `useParams<{ ... }>()` — not `use(params)` — to avoid silent Suspense without a boundary.
- **ESLint forbids synchronous `setState` inside `useEffect`** (`react-hooks/set-state-in-effect`). Bootstrap from `localStorage` in a `useState` initializer instead. See the landing page.
- Dynamic route segment folders are `[daoId]` and `[daoId]/[proposalId]`. URL-encoded dots in account ids round-trip fine, but we still `decodeURIComponent(params.daoId)` defensively.

---

## 4. File layout quick reference

| Path | Purpose |
| ---- | ------- |
| `src/app/layout.tsx` | Root layout, site metadata (for `sputnik-dao.trezu.org`), `<Providers>` wrapper. |
| `src/app/providers.tsx` | `NearProvider` with mainnet client. Only place that configures the network. |
| `src/app/page.tsx` | Landing: wallet connect + DAO picker. Persists last DAO to `localStorage`. |
| `src/app/[daoId]/page.tsx` | DAO dashboard. Reads `get_policy`; gates New Proposal on membership. |
| `src/app/[daoId]/[proposalId]/page.tsx` | Proposal detail. Breadcrumb back, full kind JSON, per-voter table. |
| `src/components/Chrome.tsx` | `SiteHeader` (logo + "by Trezu" + wallet), `SiteFooter` (repo link), and the DAO switcher. Use on every page. |
| `src/components/ProposalList.tsx` | Paginated list (page_size=25). Links to detail page per row. |
| `src/components/ProposalCard.tsx` | Shared card. `detailed` mode for the detail page, `linkToDetail` for the list. |
| `src/components/CreateProposal.tsx` | New Proposal dialog. Consumes templates from `lib/proposalTemplates.ts`. |
| `src/hooks/useDao.ts` | All Sputnik RPC: reads (`useLastProposalId`, `useProposals`, `useProposal`, `usePolicy`, `useConfig`) and writes (`useAddProposal`, `useActProposal`). |
| `src/lib/sputnik.ts` | Zod schemas and role-resolution helpers. |
| `src/lib/proposalTemplates.ts` | 17 `ProposalKind` templates. `ChangePolicy`, `ChangeConfig`, and the policy-parameter variants pull from on-chain state when available. |
| `src/lib/near.ts` | Amount formatting, timestamp conversion, account-id validation. |

---

## 5. Common pitfalls (things that have bitten us)

1. **Schema too strict → empty UI, no error.** An RPC call returns 25 proposals, Zod `.parse()` throws because `vote_counts` has numbers and the schema expected strings. TanStack serves `data: undefined`, the UI shows "No proposals". Always test schemas against a real mainnet DAO before shipping.
2. **Forgot to cast `functionArgs` to `JsonValue`.** Typecheck breaks with "Type 'unknown' is not assignable to type 'JsonValue | undefined'". Cast at the builder, not globally.
3. **Multiple `QueryClientProvider` instances.** Custom `useQuery` hooks resolve to a client different from the one `NearProvider` uses → invalidations don't propagate, DevTools shows "no matching queries". Fix: use only `NearProvider`.
4. **`--font-geist-sans` vs `--font-sans`.** The only indication is "fonts look wrong"; no console warning.
5. **Gas too low on `act_proposal`.** 50 TGas isn't enough if the vote tips the proposal to Approved and a `FunctionCall` payload executes in the same receipt. Use 200 TGas.
6. **Exact bond mismatch.** `add_proposal` reverts with `ERR_MIN_BOND` on any deviation. Copy `policy.proposal_bond` character-for-character.

---

## 6. Running end-to-end tests against mainnet

The `agent-browser` CLI can automate every non-signing flow:

```bash
pnpm dev          # starts on :3000
agent-browser set viewport 1280 900
agent-browser open http://localhost:3000
agent-browser wait 3000
agent-browser snapshot -i                # interactive tree with @ref ids
agent-browser fill @e3 "testing-astradao.sputnik-dao.near"
agent-browser click @e4                  # Open DAO
agent-browser wait 4000
agent-browser screenshot /tmp/x.png
agent-browser close --all
```

Transaction flows (`add_proposal`, `act_proposal`) require a real wallet. Use testnet for those — flip the client in `providers.tsx` and use a testnet DAO. Revert before committing.

---

## 7. House rules for changes

- **Keep bundles small.** Don't add deps for things that are 20 lines of TS.
- **No comments that describe what the code does.** Comments are reserved for WHY something non-obvious exists (a contract quirk, a serialization workaround).
- **No backwards-compatibility shims** for features that were never shipped.
- **One logical change per PR.** Refactors go in their own PR.
- **Test against `testing-astradao.sputnik-dao.near`** for any change that touches a read path. 622+ proposals across 17 kinds is the best available breadth test.
