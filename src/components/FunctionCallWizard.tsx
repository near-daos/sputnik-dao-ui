"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  base64DecodeUtf8,
  base64EncodeUtf8,
  formatGasUnitsAsTGas,
  formatNearAmount,
  parseNearToYocto,
  parseTGasToGasUnits,
} from "@/lib/near";

export type DepositUnit = "NEAR" | "yoctoNEAR";

export interface WizardAction {
  method_name: string;
  args: string; // plaintext; serialized as base64
  depositAmount: string;
  depositUnit: DepositUnit;
  gasTGas: string;
}

export interface FunctionCallWizardState {
  receiver_id: string;
  actions: WizardAction[];
}

export function emptyWizardAction(): WizardAction {
  return {
    method_name: "",
    args: "",
    depositAmount: "0",
    depositUnit: "NEAR",
    gasTGas: "100",
  };
}

export function emptyWizardState(
  receiver_id = "example.near",
): FunctionCallWizardState {
  return { receiver_id, actions: [emptyWizardAction()] };
}

/**
 * Serialize wizard state to the JSON shape Sputnik's `ProposalKind::FunctionCall`
 * expects. Deposit is converted to a yoctoNEAR string, gas to a base-unit
 * string (1 TGas = 10^12), and `args` is base64-encoded UTF-8 bytes.
 */
export function wizardToKind(state: FunctionCallWizardState): unknown {
  return {
    FunctionCall: {
      receiver_id: state.receiver_id,
      actions: state.actions.map((a) => ({
        method_name: a.method_name,
        args: base64EncodeUtf8(a.args),
        deposit:
          a.depositUnit === "NEAR"
            ? parseNearToYocto(a.depositAmount)
            : a.depositAmount.trim() || "0",
        gas: parseTGasToGasUnits(a.gasTGas),
      })),
    },
  };
}

/**
 * Attempt to parse an arbitrary ProposalKind JSON back into wizard state so
 * toggling Wizard ↔ Raw JSON can round-trip when the shape is a valid
 * FunctionCall. Returns null on any mismatch — caller should fall back to
 * plain JSON editing.
 */
export function kindToWizard(
  kind: unknown,
): FunctionCallWizardState | null {
  if (!kind || typeof kind !== "object") return null;
  const outer = kind as Record<string, unknown>;
  if (!("FunctionCall" in outer)) return null;
  const fc = outer.FunctionCall;
  if (!fc || typeof fc !== "object") return null;
  const fcObj = fc as Record<string, unknown>;
  if (typeof fcObj.receiver_id !== "string") return null;
  if (!Array.isArray(fcObj.actions)) return null;

  const actions: WizardAction[] = [];
  for (const a of fcObj.actions) {
    if (!a || typeof a !== "object") return null;
    const ao = a as Record<string, unknown>;
    const method_name = typeof ao.method_name === "string" ? ao.method_name : "";
    const rawArgs = typeof ao.args === "string" ? ao.args : "";
    const decoded = base64DecodeUtf8(rawArgs);
    const args = decoded !== null ? decoded : rawArgs;
    const deposit = typeof ao.deposit === "string" ? ao.deposit : "0";
    const gas = typeof ao.gas === "string" ? ao.gas : "0";
    actions.push({
      method_name,
      args,
      depositAmount: deposit,
      depositUnit: "yoctoNEAR",
      gasTGas: formatGasUnitsAsTGas(gas),
    });
  }

  return { receiver_id: fcObj.receiver_id, actions };
}

function depositPreview(a: WizardAction): string {
  const yocto =
    a.depositUnit === "NEAR"
      ? parseNearToYocto(a.depositAmount)
      : a.depositAmount.trim() || "0";
  if (yocto === "0") return "0 yoctoNEAR";
  return a.depositUnit === "NEAR"
    ? `= ${yocto} yoctoNEAR`
    : `≈ ${formatNearAmount(yocto)} NEAR`;
}

function gasPreview(gasTGas: string): string {
  const parsed = parseTGasToGasUnits(gasTGas);
  return parsed === "0" ? "0 gas units" : `= ${parsed} gas units`;
}

export function FunctionCallWizard({
  value,
  onChange,
}: {
  value: FunctionCallWizardState;
  onChange: (next: FunctionCallWizardState) => void;
}) {
  const updateAction = (i: number, patch: Partial<WizardAction>) => {
    onChange({
      ...value,
      actions: value.actions.map((a, idx) =>
        idx === i ? { ...a, ...patch } : a,
      ),
    });
  };

  const removeAction = (i: number) => {
    onChange({
      ...value,
      actions: value.actions.filter((_, idx) => idx !== i),
    });
  };

  const addAction = () => {
    onChange({ ...value, actions: [...value.actions, emptyWizardAction()] });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fc-receiver">Receiver account id</Label>
        <Input
          id="fc-receiver"
          placeholder="example.near"
          value={value.receiver_id}
          onChange={(e) => onChange({ ...value, receiver_id: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          The contract the DAO will call when this proposal is approved.
        </p>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[13px]">
            Actions ({value.actions.length})
          </Label>
          <p className="text-xs text-muted-foreground">
            All actions are executed in a single transaction, in order.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addAction}
        >
          <Plus className="h-3.5 w-3.5" />
          Add action
        </Button>
      </div>

      <div className="space-y-3">
        {value.actions.map((action, i) => (
          <div
            key={i}
            className="rounded-lg border bg-muted/20 p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px]">
                Action #{i + 1}
              </Badge>
              {value.actions.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAction(i)}
                  aria-label={`Remove action ${i + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`fc-method-${i}`}>Method name</Label>
              <Input
                id={`fc-method-${i}`}
                placeholder="method_name"
                value={action.method_name}
                onChange={(e) =>
                  updateAction(i, { method_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`fc-args-${i}`}>
                Args (plaintext — base64-encoded on submit)
              </Label>
              <Textarea
                id={`fc-args-${i}`}
                className="font-mono text-xs"
                rows={4}
                placeholder={`{"key": "value"}`}
                value={action.args}
                onChange={(e) => updateAction(i, { args: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Usually a JSON object. Will be encoded to{" "}
                <code className="rounded bg-background px-1 py-0.5 text-[10px]">
                  base64
                </code>{" "}
                when building the proposal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`fc-deposit-${i}`}>Attached deposit</Label>
                <div className="flex gap-2">
                  <Input
                    id={`fc-deposit-${i}`}
                    inputMode="decimal"
                    placeholder="0"
                    value={action.depositAmount}
                    onChange={(e) =>
                      updateAction(i, { depositAmount: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Select
                    value={action.depositUnit}
                    onValueChange={(v) =>
                      updateAction(i, { depositUnit: v as DepositUnit })
                    }
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEAR">NEAR</SelectItem>
                      <SelectItem value="yoctoNEAR">yoctoNEAR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {depositPreview(action)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`fc-gas-${i}`}>Gas</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`fc-gas-${i}`}
                    inputMode="decimal"
                    placeholder="100"
                    value={action.gasTGas}
                    onChange={(e) =>
                      updateAction(i, { gasTGas: e.target.value })
                    }
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">TGas</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {gasPreview(action.gasTGas)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
