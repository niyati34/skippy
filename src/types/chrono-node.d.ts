declare module "chrono-node" {
  export function parseDate(
    text: string,
    refDate?: Date,
    options?: any
  ): Date | null;
  export function parse(text: string, refDate?: Date, options?: any): any[];
}
