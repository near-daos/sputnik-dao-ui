# Contributing

Thanks for taking the time to help improve Sputnik DAO UI. This is a small, focused Next.js app — contributions that keep it small and focused are the easiest to land.

## Development environment

You need **Node 20+** and **pnpm 10+**.

```bash
git clone https://github.com/near-daos/sputnik-dao-ui
cd sputnik-dao-ui
pnpm install
pnpm dev          # http://localhost:3000
```

Useful scripts:

| Command         | What it does                                              |
| --------------- | --------------------------------------------------------- |
| `pnpm dev`      | Start the Next.js dev server with hot reload.             |
| `pnpm build`    | Production build. Must pass before opening a PR.          |
| `pnpm lint`     | ESLint (Next.js core-web-vitals + TS).                    |
| `npx tsc --noEmit` | Full TypeScript typecheck.                             |

Before pushing, make sure `pnpm lint && pnpm build` both pass cleanly.

## Project structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout + site metadata + <Providers>
│   ├── providers.tsx           # NearProvider (mainnet client)
│   ├── page.tsx                # Landing — wallet connect + DAO picker
│   └── [daoId]/
│       ├── page.tsx            # DAO dashboard (paginated proposal list)
│       └── [proposalId]/
│           └── page.tsx        # Single-proposal view
├── components/
│   ├── ui/                     # shadcn primitives — do not hand-edit
│   ├── Chrome.tsx              # SiteHeader + SiteFooter (used on every page)
│   ├── ProposalCard.tsx        # Shared card used by list + detail
│   ├── ProposalList.tsx        # Paginated list view
│   └── CreateProposal.tsx      # "New proposal" dialog with templates
├── hooks/
│   └── useDao.ts               # useLastProposalId, useProposals, useProposal,
│                               #   usePolicy, useConfig, useAddProposal,
│                               #   useActProposal
└── lib/
    ├── near.ts                 # Amount formatting, account-id validation,
    │                           #   timestamp helpers
    ├── sputnik.ts              # Zod schemas (Proposal, Policy, Config, Vote)
    │                           #   and role helpers
    ├── proposalTemplates.ts    # The 17 ProposalKind templates
    └── utils.ts                # shadcn `cn` utility
```

## Conventions

- **TypeScript** everywhere. No implicit `any`; cast at boundaries when needed.
- **Client components** for everything interactive (`"use client"` at the top of the page file is fine — this app has no server components of note).
- **Data fetching** goes through `useContractReadFunction` from `react-near-ts`. Do **not** add a second `QueryClientProvider` — `NearProvider` already supplies one.
- **Transactions** go through `useExecuteTransaction` + `functionCall(...)`. On success, invalidate with the contract-wide key so every read refetches:
  ```ts
  context.client.invalidateQueries({
    queryKey: ["callContractReadFunction", daoId],
  });
  ```
- **Zod schemas** for every contract deserializer. Be lenient for numeric-ish fields that may be emitted as either strings or numbers across contract versions (see `vote_counts` in `src/lib/sputnik.ts`).
- **Styling** uses shadcn + Tailwind v4 with the olive base color. Do not add hardcoded colors (`bg-green-600`) — use soft tinted variants that work in dark mode (examples throughout `ProposalCard.tsx`). Header/footer come from `SiteHeader` / `SiteFooter`; use them on new pages.
- **No new dependencies** without a reason. This app ships Next + react-near-ts + shadcn + Zod and nothing else.
- **Keep it small.** Three similar lines are better than a premature abstraction.

## Testing a change end-to-end

The wallet-signing path cannot be exercised by headless browsers. The rest can:

1. `pnpm dev` and open http://localhost:3000.
2. If you touched a contract-read path, test against `testing-astradao.sputnik-dao.near` — it's a real mainnet v2 DAO with 600+ proposals, varied proposal kinds, and a mix of statuses.
3. For UI-only changes, use [`agent-browser`](https://www.npmjs.com/package/agent-browser) to snapshot flows programmatically:
    ```bash
    agent-browser open http://localhost:3000 && agent-browser screenshot /tmp/x.png
    ```
4. For transaction flows (vote / create), manually test on testnet with a real wallet. Switch networks in `src/app/providers.tsx` (`createTestnetClient`, `networkId: "testnet"`) and revert before you commit.

## Pull requests

- One logical change per PR. Refactors go in their own PR, not bundled with a feature.
- Include a "before / after" screenshot for any visible UI change.
- Reference the Sputnik contract method by name and source link when the change touches a contract call (`get_proposal`, `act_proposal`, etc.).
- Do not commit `.env.local`, IDE settings, or `next build` artifacts.

## Reporting issues

Security-sensitive issues (anything involving transaction integrity, wallet authorization, or user funds): please email the maintainers before filing a public issue. Everything else: open a GitHub issue with:

- What you expected to happen.
- What actually happened.
- The DAO contract account id and proposal id(s) if applicable.
- Browser + wallet + approximate wallet version.

## License

By contributing, you agree your changes are released under the MIT license in [LICENSE](./LICENSE).
