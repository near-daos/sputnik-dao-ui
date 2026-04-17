"use client";

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function preprocess(text: string): string {
  return text
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/\r\n/g, "\n");
}

function parseProposalIdFromHref(
  href: string | undefined,
): number | null {
  if (!href) return null;
  const match = href.match(/(?:^|[?&])id=(\d+)/);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ProposalDescription({
  text,
  daoId,
  className,
}: {
  text: string;
  daoId: string;
  className?: string;
}) {
  const source = preprocess(text);

  const components: Components = {
    a({ href, children, ...rest }) {
      const proposalId = parseProposalIdFromHref(href);
      if (proposalId !== null) {
        return (
          <Link
            href={`/${daoId}/${proposalId}`}
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            {children}
          </Link>
        );
      }
      return (
        <a
          {...rest}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          {children}
        </a>
      );
    },
    ul({ children }) {
      return <ul className="list-disc pl-5 space-y-0.5">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal pl-5 space-y-0.5">{children}</ol>;
    },
    p({ children }) {
      return <p className="leading-relaxed">{children}</p>;
    },
    code({ children }) {
      return (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] break-all">
          {children}
        </code>
      );
    },
    pre({ children }) {
      return (
        <pre className="overflow-x-auto rounded-md border bg-muted/30 p-2 text-[11px] leading-snug">
          {children}
        </pre>
      );
    },
    h1({ children }) {
      return <h3 className="text-sm font-semibold">{children}</h3>;
    },
    h2({ children }) {
      return <h3 className="text-sm font-semibold">{children}</h3>;
    },
    h3({ children }) {
      return <h3 className="text-sm font-semibold">{children}</h3>;
    },
    hr() {
      return <hr className="my-2 border-border" />;
    },
  };

  return (
    <div
      className={
        "text-sm break-words space-y-1.5" + (className ? " " + className : "")
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
