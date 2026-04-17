"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FunctionCallWizard,
  type FunctionCallWizardState,
  emptyWizardState,
  kindToWizard,
  wizardToKind,
} from "@/components/FunctionCallWizard";
import { useAddProposal, useConfig } from "@/hooks/useDao";
import { formatNearAmount } from "@/lib/near";
import type { Policy } from "@/lib/sputnik";
import {
  GROUP_LABELS,
  getTemplates,
  type KindTemplateId,
} from "@/lib/proposalTemplates";

type EditorMode = "wizard" | "json";

export function CreateProposal({
  daoId,
  proposalBondYocto,
  policy,
  disabled = false,
  disabledTooltip = null,
}: {
  daoId: string;
  proposalBondYocto: string;
  policy: Policy | null;
  disabled?: boolean;
  disabledTooltip?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const configQ = useConfig(daoId);
  const config = configQ.data?.result ?? null;

  const templates = useMemo(
    () => getTemplates({ daoId, policy, config }),
    [daoId, policy, config],
  );

  const [templateId, setTemplateId] = useState<KindTemplateId>("Vote");
  const template = templates.find((t) => t.id === templateId) ?? templates[0];

  const [description, setDescription] = useState(template.description);
  const [kindJson, setKindJson] = useState(() =>
    JSON.stringify(template.kind, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const [mode, setMode] = useState<EditorMode>("wizard");
  const [wizardState, setWizardState] = useState<FunctionCallWizardState>(
    () => kindToWizard(template.kind) ?? emptyWizardState(),
  );
  const [wizardParseWarning, setWizardParseWarning] = useState<string | null>(
    null,
  );

  const isFunctionCall = templateId === "FunctionCall";

  const applyTemplate = (id: KindTemplateId) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setDescription(t.description);
    setKindJson(JSON.stringify(t.kind, null, 2));
    setParseError(null);
    setWizardParseWarning(null);
    if (id === "FunctionCall") {
      setWizardState(kindToWizard(t.kind) ?? emptyWizardState());
      setMode("wizard");
    }
  };

  const switchMode = (next: EditorMode) => {
    if (next === mode) return;
    if (next === "json") {
      setKindJson(JSON.stringify(wizardToKind(wizardState), null, 2));
      setMode("json");
      setWizardParseWarning(null);
    } else {
      // json → wizard: parse current textarea, fall back to existing state
      try {
        const parsed = JSON.parse(kindJson);
        const ws = kindToWizard(parsed);
        if (ws) {
          setWizardState(ws);
          setWizardParseWarning(null);
        } else {
          setWizardParseWarning(
            "Couldn't load the current JSON into the wizard — it doesn't look like a FunctionCall kind. The wizard kept its previous values.",
          );
        }
      } catch {
        setWizardParseWarning(
          "Current JSON is invalid — the wizard kept its previous values.",
        );
      }
      setMode("wizard");
    }
  };

  const add = useAddProposal(daoId);

  const bondNear = useMemo(
    () => formatNearAmount(proposalBondYocto),
    [proposalBondYocto],
  );

  const onSubmit = () => {
    let parsed: unknown;
    if (isFunctionCall && mode === "wizard") {
      parsed = wizardToKind(wizardState);
    } else {
      try {
        parsed = JSON.parse(kindJson);
      } catch (e) {
        setParseError(`Invalid JSON: ${(e as Error).message}`);
        return;
      }
    }
    if (parsed !== "Vote" && (parsed === null || typeof parsed !== "object")) {
      setParseError(
        'Kind must be a JSON object (e.g. {"Transfer": {...}}) or the string "Vote".',
      );
      return;
    }
    setParseError(null);
    add.submit(description, parsed, proposalBondYocto);
  };

  const grouped = useMemo(() => {
    const groups: Record<string, typeof templates> = {};
    for (const t of templates) {
      (groups[t.group] ||= []).push(t);
    }
    return groups;
  }, [templates]);

  const triggerButton = (
    <Button size="sm" disabled={disabled}>
      New proposal
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {disabled ? (
        disabledTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-block">
                {triggerButton}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {disabledTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          triggerButton
        )
      ) : (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create proposal</DialogTitle>
          <DialogDescription>
            Submit a new proposal. A bond of {bondNear} NEAR is attached and is
            returned if the proposal is approved or rejected (not removed as
            spam).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select
              value={templateId}
              onValueChange={(v) => applyTemplate(v as KindTemplateId)}
            >
              <SelectTrigger id="template" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(grouped) as Array<keyof typeof GROUP_LABELS>).map(
                  (g) => (
                    <SelectGroup key={g}>
                      <SelectLabel>{GROUP_LABELS[g]}</SelectLabel>
                      {grouped[g].map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ),
                )}
              </SelectContent>
            </Select>
            {(templateId === "ChangePolicy" ||
              templateId === "ChangeConfig" ||
              templateId === "ChangePolicyUpdateDefaultVotePolicy" ||
              templateId === "ChangePolicyUpdateParameters") &&
              (policy === null || (templateId === "ChangeConfig" && config === null)) && (
                <p className="text-[11px] text-muted-foreground">
                  Loading current DAO state — the template will prefill when ready.
                </p>
              )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this proposal about?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {isFunctionCall && (
            <Tabs
              value={mode}
              onValueChange={(v) => switchMode(v as EditorMode)}
            >
              <TabsList>
                <TabsTrigger value="wizard">Wizard</TabsTrigger>
                <TabsTrigger value="json">Raw JSON</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {isFunctionCall && mode === "wizard" ? (
            <div className="space-y-2">
              <FunctionCallWizard
                value={wizardState}
                onChange={setWizardState}
              />
              {wizardParseWarning && (
                <Alert variant="destructive">
                  <AlertDescription>{wizardParseWarning}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="kind">Proposal kind (JSON)</Label>
              <p className="text-xs text-muted-foreground">
                Edit the JSON below — it becomes the <code>kind</code> field
                passed to <code>add_proposal</code>. <code>U128</code> amounts
                are strings in yoctoNEAR; durations are nanoseconds.
              </p>
              <Textarea
                id="kind"
                className="font-mono text-xs"
                rows={14}
                value={kindJson}
                onChange={(e) => setKindJson(e.target.value)}
              />
            </div>
          )}

          {parseError && (
            <Alert variant="destructive">
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {add.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Transaction failed: {String(add.error)}
              </AlertDescription>
            </Alert>
          )}
          {add.isSuccess && (
            <Alert>
              <AlertDescription>
                Proposal created. You can close this dialog.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={onSubmit} disabled={add.isPending}>
            {add.isPending ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
