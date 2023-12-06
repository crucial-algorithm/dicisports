import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import type { TFunction } from 'i18next';

import type { RaceParticipant } from '~/types';

export default async function exportRaceParticipantsToExcel({
  raceParticipants,
  fileName,
  t
}: {
  raceParticipants: RaceParticipant[];
  fileName: string;
  t: TFunction;
}) {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet(t('Participants'));

  worksheet.columns = [
    { header: t('Athlete'), key: 'athlete', width: 20 },
    { header: t('Team'), key: 'team', width: 20 },
    { header: t('Bib Number'), key: 'bibNumber', width: 10 },
    { header: t('Identity Card'), key: 'identityCard', width: 20 },
    { header: t('VAT Number'), key: 'vatNumber', width: 20 }
  ];

  // Set column titles to be bold - setting font family as well since it keeps changing 🤷‍♂️
  const row = worksheet.getRow(1);

  row.font = { bold: true, name: 'Calibri' };

  raceParticipants.map((r) => {
    return worksheet.addRow({
      athlete: `${r.participant.firstName} ${r.participant.lastName}`,
      team: r.team ? r.team.name : t('Individual'),
      bibNumber: r.bibNumber ? r.bibNumber : '-',
      race: r.race.name,
      identityCard: r.participant.identityCard,
      vatNumber: r.participant.vatNumber
    });
  });

  // @ts-ignore
  const xls64 = await workbook.xlsx.writeBuffer({ base64: true });

  saveAs(
    new Blob([xls64], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }),
    fileName
  );
}
