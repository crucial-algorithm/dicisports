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

export default function DisplayDate({ date }: { date: Date | null }) {
  const { t } = useTranslation('common');

  if (!date) {
    return null;
  }

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const formatted = `${day} ${t(months[month])}, ${year}`;

  return <>{formatted}</>;
}
