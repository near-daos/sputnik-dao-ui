"use client";

import Link from "next/link";
import {
  useConnectedAccount,
  useNearSignIn,
  useNearSignOut,
} from "react-near-ts";
import { Button } from "@/components/ui/button";
import { DaoSwitcher } from "@/components/DaoSwitcher";
import { NearIcon } from "@/components/NearIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { shortenAccount } from "@/lib/near";

const GITHUB_URL = "https://github.com/near-daos/sputnik-dao-ui";
const TREZU_URL = "https://trezu.org";

function Brand() {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Link
        href="/"
        className="flex items-center gap-1.5 shrink-0"
        aria-label="Sputnik DAO — home"
      >
        <NearIcon className="h-5 w-5" />
        <span className="text-base font-semibold tracking-tight hidden sm:inline">
          Sputnik DAO
        </span>
      </Link>
      <span className="hidden text-xs text-muted-foreground sm:inline whitespace-nowrap">
        by{" "}
        <a
          href={TREZU_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Trezu
        </a>
      </span>
    </div>
  );
}

export function SiteHeader({
  daoId,
}: {
  daoId?: string;
}) {
  const account = useConnectedAccount();
  const { signIn } = useNearSignIn();
  const { signOut } = useNearSignOut();

  const connectedAccountId = account.isConnectedAccount
    ? account.connectedAccountId
    : null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Brand />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {connectedAccountId ? (
            <>
              <span className="hidden md:inline font-mono text-xs text-muted-foreground">
                {shortenAccount(connectedAccountId)}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => signIn()}>
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      {daoId && (
        <div className="border-t bg-muted/30">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-1.5 sm:px-6">
            <DaoSwitcher currentDaoId={daoId}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  DAO
                </span>
                <span className="truncate text-sm font-medium">{daoId}</span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  · switch
                </span>
              </div>
            </DaoSwitcher>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-2xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
      <p>Reads and writes go directly to the NEAR mainnet contract.</p>
      <p className="mt-1">
        <a
          href="https://github.com/near-daos/sputnik-dao-contract"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          Sputnik DAO
        </a>
        {" · "}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          Source on GitHub
        </a>
      </p>
    </footer>
  );
}
