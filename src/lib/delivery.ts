/** "entre lun. 12 et mer. 14 oct." — 2 to 4 working days, Sundays skipped */
export function deliveryWindow(from = new Date()): string {
  const add = (n: number) => {
    const d = new Date(from);
    let left = n;
    while (left > 0) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0) left--;
    }
    return d;
  };
  const a = add(2);
  const b = add(4);
  const day = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  const month = b.toLocaleDateString("fr-FR", { month: "short" });
  return `entre ${day(a)} et ${day(b)} ${month}`;
}
