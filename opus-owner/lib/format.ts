export const number = (value: number) =>
  new Intl.NumberFormat("en-GB").format(value);
export function bytes(value: number): string {
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1000)),
    units.length - 1,
  );
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: index ? 1 : 0 }).format(value / 1000 ** index)} ${units[index]}`;
}
export const date = (value: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Skopje",
  }).format(value);
