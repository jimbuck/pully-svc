
interface PropertyDecorator {

}

interface StringDef {
  (): PropertyDecorator;
  (length: number): PropertyDecorator;
  (minLength: number, maxLength: number): PropertyDecorator;
  (pattern: RegExp): PropertyDecorator;
}

export const Str: StringDef = function Pattern(pattern?: number | RegExp, maxLength?: number) {
  return {} as PropertyDecorator;
};

export function stripTime(date: Date): Date;
export function stripTime(ms: number): number;
export function stripTime(date: number | Date): number | Date {
  let d = new Date(date);
  let cleanDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

  if (date instanceof Date) {
    return cleanDate;
  } else {
    return cleanDate.valueOf();
  }
}