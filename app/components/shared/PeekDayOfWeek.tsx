import React from 'react';
import { useTranslation } from 'react-i18next';

import ComboBox from '~/components/shared/form/ComboBox';
import type { DaysOfWeek, Language } from '~/types';

export default function PeekDayOfWeek(props: {
  name: string;
  id: string;
  defaultValue?: DaysOfWeek | null;
  addAll?: boolean;
  input?: React.RefObject<HTMLInputElement>;
  onChange?: (value: string | number) => void;
}) {
  const { t, i18n } = useTranslation('common');
  const { id, name, defaultValue, addAll, onChange } = props;
  const options = [
    { value: 6, label: t('Sunday') },
    { value: 0, label: t('Monday') },
    { value: 1, label: t('Tuesday') },
    { value: 2, label: t('Wednesday') },
    { value: 3, label: t('Thursday') },
    { value: 4, label: t('Friday') },
    { value: 5, label: t('Saturday') }
  ];

  function handleChangeDay(value: string | number) {

    onChange && onChange(value);
  }

  return (
    <>
      <ComboBox
        name={name}
        onChange={handleChangeDay}
        lang={i18n.language as Language}
        id={id}
        placeholder={addAll ? t('Any Day Of week') : ''}
        defaultValue={defaultValue === null ? '' : defaultValue}
        options={options}
      />
    </>
  );
}
