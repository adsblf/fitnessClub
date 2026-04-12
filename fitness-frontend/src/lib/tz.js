/** Timezone identifier for UTC+6 (Almaty / Omsk) */
export const TZ = "Asia/Almaty";

/**
 * "YYYY-MM-DD" for today in UTC+6.
 * Safe to use as value for input[type=date].
 */
export function todayStr() {
    return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * "YYYY-MM-DD" for N days ago in UTC+6.
 */
export function daysAgoStr(n) {
    const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * "YYYY-MM-DD" for the 1st day of the current month in UTC+6.
 */
export function firstOfMonthStr() {
    const [year, month] = new Date()
        .toLocaleDateString("en-CA", { timeZone: TZ })
        .split("-");
    return `${year}-${month}-01`;
}
