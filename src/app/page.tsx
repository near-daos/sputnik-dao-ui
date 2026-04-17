"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConnectedAccount } from "react-near-ts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { MemberTreasuries } from "@/components/MemberTreasuries";
import { isValidAccountId } from "@/lib/near";
import { addRecentDao, getRecentDaos } from "@/lib/recentDaos";

export default function LandingPage() {
  const router = useRouter();
  const account = useConnectedAccount();
  const connectedAccountId = account.isConnectedAccount
    ? account.connectedAccountId
    : null;

  const [daoId, setDaoId] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("sputnik-dao-ui:last-dao") ?? "";
  });
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(() => getRecentDaos());

  const onOpen = (candidate?: string) => {
    const trimmed = (candidate ?? daoId).trim();
    if (!isValidAccountId(trimmed)) {
      setError("Not a valid NEAR account id.");
      return;
    }
    setError(null);
    addRecentDao(trimmed);
    router.push(`/${trimmed}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 w-full">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Manage a Sputnik DAO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect a wallet that is a member of the DAO, then enter the DAO
              contract account id to view and vote on proposals.
            </p>

            {!connectedAccountId && (
              <Alert>
                <AlertDescription>
                  Connect your wallet to create or vote on proposals.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="dao">DAO contract account id</Label>
              <Input
                id="dao"
                placeholder="testing-astradao.sputnik-dao.near"
                value={daoId}
                onChange={(e) => setDaoId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onOpen();
                }}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <Button onClick={() => onOpen()} disabled={!daoId.trim()}>
              Open DAO
            </Button>

            {recent.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs text-muted-foreground">
                  Recent
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        setDaoId(id);
                        setRecent(getRecentDaos());
                        onOpen(id);
                      }}
                      className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted break-all text-left"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {connectedAccountId && (
          <Card>
            <CardHeader>
              <CardTitle>Your memberships</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground break-all">
                DAOs where <span className="font-mono">{connectedAccountId}</span>{" "}
                is a member (via api.trezu.app).
              </p>
              <MemberTreasuries accountId={connectedAccountId} />
            </CardContent>
          </Card>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
