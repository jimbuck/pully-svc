const parseDuration: ((str: string) => number) = require('parse-duration');

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

export function parseDateOrDurationAgo(mysteryStr: string): number {
  const now = Date.now();
  try {
    let agoTime = new Date(mysteryStr).valueOf();
    if (isNaN(agoTime))
      agoTime = now - parseDuration(mysteryStr);
    if (!isNaN(agoTime))
      return stripTime(agoTime);
  }
  catch {
    // Do nothing...
  }
  return stripTime(now);
}