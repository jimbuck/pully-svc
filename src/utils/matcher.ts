const multimatch: (str: string, patterns: string[]) => boolean = require('multimatch');

export function matchPatterns(title: string, globalPatterns: null | string[], localPatterns: null | string[]): boolean {   
  let matchesGlobal = multimatch(title, globalPatterns || ['*']);
  let matchesLocal = multimatch(title, localPatterns || ['*']);

  return matchesGlobal && matchesLocal;
}
