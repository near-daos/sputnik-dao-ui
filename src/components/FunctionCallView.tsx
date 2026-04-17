"use client";

import { Badge } from "@/components/ui/badge";
import {
  base64DecodeUtf8,
  formatGasUnitsAsTGas,
  formatNearAmount,
} from "@/lib/near";

interface RawAction {
  method_name: unknown;
  args: unknown;
  deposit: unknown;
  gas: unknown;
}

interface RawFunctionCall {
  receiver_id: unknown;
  actions: unknown;
}

export function isFunctionCallKind(
  kind: unknown,
): kind is { FunctionCall: RawFunctionCall } {
  if (!kind || typeof kind !== "object") return false;
  const outer = kind as Record<string, unknown>;
  if (!("FunctionCall" in outer)) return false;
  const fc = outer.FunctionCall;
  if (!fc || typeof fc !== "object") return false;
  const fcObj = fc as Record<string, unknown>;
  return (
    typeof fcObj.receiver_id === "string" && Array.isArray(fcObj.actions)
  );
}

type ArgsDisplay =
  | { variant: "empty" }
  | { variant: "json"; pretty: string }
  | { variant: "text"; text: string; raw: string }
  | { variant: "binary"; raw: string };

function classifyArgs(raw: unknown): ArgsDisplay {
  const b64 = typeof raw === "string" ? raw : "";
  if (!b64) return { variant: "empty" };
  const decoded = base64DecodeUtf8(b64);
  if (decoded === null) return { variant: "binary", raw: b64 };
  try {
    const parsed = JSON.parse(decoded);
    return {
      variant: "json",
      pretty: JSON.stringify(parsed, null, 2),
    };
  } catch {
    return { variant: "text", text: decoded, raw: b64 };
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function ActionView({ action, index }: { action: RawAction; index: number }) {
  const methodName =
    typeof action.method_name === "string" ? action.method_name : "";
  const deposit = typeof action.deposit === "string" ? action.deposit : "0";
  const gas = typeof action.gas === "string" ? action.gas : "0";
  const argsDisplay = classifyArgs(action.args);
  const depositNear = formatNearAmount(deposit);
  const hasDeposit = deposit !== "0" && deposit !== "";
  const gasTGas = formatGasUnitsAsTGas(gas);

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px]">
          Action #{index + 1}
        </Badge>
        <code className="rounded bg-background px-1.5 py-0.5 text-xs font-mono break-all">
          {methodName || "(no method)"}
        </code>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <FieldLabel>args</FieldLabel>
          {argsDisplay.variant === "json" && (
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
            >
              JSON
            </Badge>
          )}
          {argsDisplay.variant === "text" && (
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
            >
              text — not valid JSON
            </Badge>
          )}
          {argsDisplay.variant === "binary" && (
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
            >
              binary — kept as base64
            </Badge>
          )}
          {argsDisplay.variant === "empty" && (
            <Badge variant="outline" className="text-[10px]">
              empty
            </Badge>
          )}
        </div>
        {argsDisplay.variant === "json" && (
          <pre className="max-h-64 overflow-auto rounded-md border bg-background p-2 text-[11px] leading-snug">
            {argsDisplay.pretty}
          </pre>
        )}
        {argsDisplay.variant === "text" && (
          <>
            <pre className="max-h-64 overflow-auto rounded-md border bg-background p-2 text-[11px] leading-snug whitespace-pre-wrap break-all">
              {argsDisplay.text}
            </pre>
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                raw base64
              </summary>
              <pre className="mt-1 break-all whitespace-pre-wrap font-mono text-[10px]">
                {argsDisplay.raw}
              </pre>
            </details>
          </>
        )}
        {argsDisplay.variant === "binary" && (
          <pre className="max-h-64 overflow-auto rounded-md border bg-background p-2 text-[10px] leading-snug break-all whitespace-pre-wrap font-mono">
            {argsDisplay.raw}
          </pre>
        )}
      </div>

      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <FieldLabel>deposit</FieldLabel>
          {hasDeposit ? (
            <span className="font-mono tabular-nums">
              {depositNear} <span className="text-muted-foreground">NEAR</span>
            </span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <FieldLabel>gas</FieldLabel>
          <span className="font-mono tabular-nums">
            {gasTGas} <span className="text-muted-foreground">TGas</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function FunctionCallView({
  kind,
}: {
  kind: { FunctionCall: RawFunctionCall };
}) {
  const fc = kind.FunctionCall;
  const receiver = typeof fc.receiver_id === "string" ? fc.receiver_id : "";
  const actions = Array.isArray(fc.actions) ? (fc.actions as RawAction[]) : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <FieldLabel>receiver</FieldLabel>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono break-all">
          {receiver}
        </code>
        <span className="text-muted-foreground">
          · {actions.length} action{actions.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <ActionView key={i} action={a} index={i} />
        ))}
      </div>
    </div>
  );
}
