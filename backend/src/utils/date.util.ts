import { z } from 'zod';

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có định dạng YYYY-MM-DD')
  .refine((value) => {
    const [yearText = '', monthText = '', dayText = ''] = value.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
    );
  }, 'Ngày không hợp lệ')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

function bangkokDayStart(date: Date): Date {
  const utcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  return new Date(utcMidnight - BANGKOK_OFFSET_MS);
}

export function startOfBangkokDay(date: Date): Date {
  return bangkokDayStart(date);
}

export function endOfBangkokDay(date: Date): Date {
  return new Date(
    bangkokDayStart(date).getTime() + MILLISECONDS_PER_DAY - 1,
  );
}
