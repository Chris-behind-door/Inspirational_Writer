declare module 'simple-markdown' {
  export function defaultBlockParse(source: string): any[];
  export function defaultInlineParse(source: string): any[];
  export function defaultRules(): Record<string, any>;
  export function parserFor(rules: Record<string, any>): (source: string) => any[];
  export function outputFor(rules: Record<string, any>, type: string): any;
  export type SingleNodeParseFunction = any;
}
