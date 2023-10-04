import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export default function DisplayDate({ date }: { date: Date | string | null }) {
  const { t } = useTranslation('common');

  if (!date) {
    return null;
  }

  const dt = typeof date === 'string' ? new Date(date) : date;

  const formatted = dateFormatter(dt, t);

  return <>{formatted}</>;
}

export function dateFormatter(date: Date, tcommon: TFunction) {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  return `${day} ${tcommon(months[month])}, ${year}`;
}
