import { Fragment, type ReactNode } from "react";

/** A translated sentence with elements in it: each `{name}` becomes `nodes[name]`. */
export function rich(sentence: string, nodes: Record<string, ReactNode>): ReactNode[] {
  return sentence
    .split(/\{(\w+)\}/)
    .map((part, i) => (i % 2 ? <Fragment key={i}>{nodes[part] ?? `{${part}}`}</Fragment> : part));
}
