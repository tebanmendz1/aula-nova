export function normalizePlainContent(value?:string|null){
  return (value||"")
    .replace(/\\n/g,"\n")
    .replace(/\r\n?/g,"\n")
    .replace(/[\u2028\u2029]/g,"\n")
    .replace(/[\uE000-\uF8FF\uFFFD\u25A1\u25A0]/g,"\n• ")
    .replace(/[ \t]*\n[ \t]*/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .replace(/(?:\n•\s*){2,}/g,"\n• ")
    .trim();
}
