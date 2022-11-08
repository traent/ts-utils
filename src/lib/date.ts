/**
 * Add day to a date
 *
 * @param days
 * @param date Date
 * @returns Date
 */
export const addDays = (days: number, date: Date = new Date()): Date => {
  date.setDate(date.getDate() + days);

  return date;
};
