import { Form } from '@remix-run/react';
import type { TFunction } from 'i18next';
import * as React from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/shared/Button';
import Dialog, { ActionsBar } from '~/components/shared/Dialog';
import CheckBox from '~/components/shared/form/CheckBox';
import type { Option } from '~/components/shared/form/ComboBox';
import ComboBox from '~/components/shared/form/ComboBox';
import FormField from '~/components/shared/form/FormField';
import PeekDayOfWeek from '~/components/shared/PeekDayOfWeek';
import { Spacer } from '~/components/shared/Spacer';
import type { FilterParams, SortMethod } from '~/routes';
import type { DaysOfWeek, GroupSpirit, Language, Sport } from '~/types';
import { getLocalizedText } from '~/utils/misc';


function FiltersDialog(props: {
  isOpen: boolean;
  sports: Sport[];
  groupsSpirit: GroupSpirit[];
  triggerModalClose: () => void;
  filters: FilterParams | null;
  onSubmit: () => void;
  coords?: string;
  search?: string;
  order: SortMethod;
}) {
  const { t, i18n } = useTranslation('home');
  const {
    isOpen,
    sports,
    groupsSpirit,
    triggerModalClose,
    filters,
    onSubmit,
    coords,
    search,
    order
  } = props;
  const sportsOptions: Option[] = sports
    .sort((a, b) => a.id - b.id)
    .map((s) => ({
      value: s.id,
      label: s.name
    }));
  const form = useRef<HTMLFormElement>(null);

  function handleApplyFilters() {
    if (!form.current) {
      return;
    }
    form.current.submit();
  }

  return (
    <Dialog
      className="md:max-w-lg search-filters"
      isOpen={isOpen}
      onClose={triggerModalClose}
      title={t('Filters')}
      PrimaryAction={
        <Button
          id="apply-filters"
          variant="primary"
          size="medium"
          name="actionId"
          type="submit"
          value={actions.search}
          onClick={handleApplyFilters}
        >
          {t('Apply Filters')}
        </Button>
      }
      SecondaryAction={
        <Button variant="secondary" type="button" onClick={triggerModalClose}>
          {t('Cancel')}
        </Button>
      }
    >
      <Form
        method="get"
        onSubmit={onSubmit}
        ref={form}
        className="w-full flex flex-col items-center justify-start p-4"
      >
        <input type="hidden" name="coords" value={coords} />
        <input type="hidden" name="search" value={search} />
        <input type="hidden" name="order" value={order} />
        <input type="hidden" name="actionId" value="search" />
        <FormField label={t('Sport')} id="sport" className="w-full md:w-112">
          <ComboBox
            options={sportsOptions}
            name="sport"
            defaultValue={filters?.sport || ''}
            placeholder={t('All Sports')}
            lang={i18n.language as Language}
          />
        </FormField>
        <FormField
          label={t('Day Of Week')}
          id="day-of-week"
          className="w-full md:w-112"
        >
          <PeekDayOfWeek
            key={Date.now()}
            name="dow"
            id="day-of-week"
            defaultValue={filters?.dayOfWeek as DaysOfWeek}
            addAll={true}
          />
        </FormField>
        <FormField
          label={t('Day Part')}
          id="day-part"
          className="w-full md:w-112"
        >
          <CheckBox
            name="daypart"
            id={`daypart-${dayParts.morning}`}
            label={t('Morning')}
            value={dayParts.morning}
            checked={filters?.dayParts?.includes(dayParts.morning)}
            className="mb-2"
          />
          <CheckBox
            name="daypart"
            id={`daypart-${dayParts.afternoon}`}
            label={t('Afternoon')}
            value={dayParts.afternoon}
            checked={filters?.dayParts?.includes(dayParts.afternoon)}
            className="mb-2"
          />
          <CheckBox
            name="daypart"
            id={`daypart-${dayParts.evening}`}
            label={t('Evening')}
            value={dayParts.evening}
            checked={filters?.dayParts?.includes(dayParts.evening)}
            className="mb-2"
          />
        </FormField>
        <FormField
          label={t('Group Spirit')}
          id="spirit"
          className="w-full md:w-112"
        >
          {groupsSpirit.map((gs) => (
            <CheckBox
              key={gs.id}
              id={`spirit-${gs.id}`}
              name="spirit"
              label={gs.name}
              value={gs.id}
              checked={filters?.spirit?.includes(gs.id)}
              className="mb-2"
            />
          ))}
          <Spacer size="3xs" />
          <CheckBox
            name="g"
            label={t('Hide Groups')}
            value="hide"
            checked={filters?.groupsAction === 'hide'}
            className="mb-2"
          />
        </FormField>
      </Form>
    </Dialog>
  );
}

function DisplayFilters(props: {
  filters: FilterParams;
  sports: Sport[];
  spirits: GroupSpirit[];
  t: TFunction;
  tc: TFunction;
}) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const { filters, sports, spirits, t, tc } = props;

  if (!filters) {
    return null;
  }
  const { spirit, sport, dayOfWeek, dayParts } = filters;
  const label: string[] = [];

  if (dayOfWeek !== null && dayOfWeek >= 0) {
    label.push(
      tc(
        [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday'
        ][dayOfWeek]
      )
    );
  }
  // if all day parts are picked, just ignore to save space
  if (dayParts && dayParts.length > 0 && dayParts.length !== 3) {
    const parts = semanticOr(
      dayParts.map((v) => t(v)),
      t('Or')
    );

    if (label.length === 1) {
      label[0] = `${label[0]}, ${parts}`;
    } else {
      label.push(parts);
    }
  }

  if (spirit && spirit.length > 0 && spirit.length !== 5) {
    label.push(
      t('Filter Spirit', {
        sport: semanticOr(
          spirit.map((s) => mapIdToName(s, spirits, language as Language)),
          t('Or')
        )
      })
    );
  }

  // using h1 for sports based on SEO recommendations from ahrefs
  return (
    <div className="flex mx-2 items-center dark:text-white text-blueGray-500 text-sm">
      {sport && (
        <h1 className="font-bold">
          {mapIdToName(sport, sports, language as Language)}{' '}
        </h1>
      )}
      {sport && label.length > 0 && <>&nbsp;|&nbsp;</>}
      {label.join(' | ')}
    </div>
  );
}


/**
 * Create a human-readable phrase from a list of strings
 * @param list
 * @param or
 */
function semanticOr(list: string[], or: string) {
  if (list.length === 1) {
    return list[0];
  }
  return `${list.slice(0, -1).join(', ')} ${or} ${list.slice(-1)}`;
}

function mapIdToName(
  id: number,
  universe: Sport[] | GroupSpirit[],
  lang: Language
): string {
  const entity = universe.find((u) => u.id === id);

  return getLocalizedText(lang, entity?.name);
}

const dayParts = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening'
};

const actions = {
  filter: 'filter',
  search: 'search',
  more: 'more',
  pickSport: 'pickSport',
  sort: 'sort'
};


export { FiltersDialog, DisplayFilters };
