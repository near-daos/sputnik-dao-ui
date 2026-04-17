"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConnectedAccount } from "react-near-ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MemberTreasuries } from "@/components/MemberTreasuries";
import { isValidAccountId } from "@/lib/near";
import {
  addRecentDao,
  getRecentDaos,
  removeRecentDao,
} from "@/lib/recentDaos";

export function DaoSwitcher({
  currentDaoId,
  children,
}: {
  currentDaoId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const account = useConnectedAccount();
  const connectedAccountId = account.isConnectedAccount
    ? account.connectedAccountId
    : null;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentDaoId);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setValue(currentDaoId);
      setError(null);
      setRecent(getRecentDaos().filter((id) => id !== currentDaoId));
    }
  };

  const go = (candidate: string) => {
    const trimmed = candidate.trim();
    if (!isValidAccountId(trimmed)) {
      setError("Not a valid NEAR account id.");
      return;
    }
    if (trimmed === currentDaoId) {
      setOpen(false);
      return;
    }
    addRecentDao(trimmed);
    setOpen(false);
    router.push(`/${trimmed}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        onClick={() => handleOpenChange(true)}
        className="min-w-0 text-left rounded hover:bg-muted/60 transition-colors -mx-1 px-1 py-0.5"
        aria-label="Switch DAO"
      >
        {children}
      </button>

      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Switch DAO</DialogTitle>
          <DialogDescription>
            Open a different Sputnik DAO by account id.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="switch-dao">DAO contract account id</Label>
            <Input
              id="switch-dao"
              placeholder="testing-astradao.sputnik-dao.near"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(value);
              }}
              autoFocus
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {connectedAccountId && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Your memberships
              </Label>
              <MemberTreasuries
                accountId={connectedAccountId}
                onPick={(id) => go(id)}
              />
            </div>
          )}

          {recent.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Recent</Label>
              <div className="space-y-1">
                {recent.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1"
                  >
                    <button
                      onClick={() => go(id)}
                      className="min-w-0 flex-1 break-all text-left text-xs hover:underline"
                    >
                      {id}
                    </button>
                    <button
                      onClick={() => {
                        removeRecentDao(id);
                        setRecent(
                          getRecentDaos().filter((x) => x !== currentDaoId),
                        );
                      }}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${id} from recents`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => go(value)} disabled={!value.trim()}>
            Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
