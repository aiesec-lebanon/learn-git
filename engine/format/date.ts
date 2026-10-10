const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const two = (n: number) => String(n).padStart(2, "0");

/** Git's default date format, e.g. `Thu Jan 1 00:04:00 2026 +0000`. */
export function formatGitDate(epoch: number, tz: string): string {
  const sign = tz.startsWith("-") ? -1 : 1;
  const offset = sign * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(3, 5)));
  const local = new Date((epoch + offset * 60) * 1000);
  const day = DAYS[local.getUTCDay()] ?? "";
  const month = MONTHS[local.getUTCMonth()] ?? "";
  const time = `${two(local.getUTCHours())}:${two(local.getUTCMinutes())}:${two(local.getUTCSeconds())}`;
  return `${day} ${month} ${local.getUTCDate()} ${time} ${local.getUTCFullYear()} ${tz}`;
}
