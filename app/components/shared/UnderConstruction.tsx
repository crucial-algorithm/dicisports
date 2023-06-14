import Brainstorming from '~/components/illustrations/Brainstorming';
import StartupFlat from '~/components/illustrations/StartupFlat';
import StartupMono from '~/components/illustrations/StartupMono';
import TeamMeetingFlatLine from '~/components/illustrations/TeamMeetingFlatLine';
import TeamMeetingMono from '~/components/illustrations/TeamMeetingMono';
import TeamMeetingOutline from '~/components/illustrations/TeamMeetingOutline';

export default function UnderConstruction({
  className
}: {
  className: string;
}) {
  const options = [
    'Brain',
    'Startup',
    'StartupFlat',
    'StartupMono',
    'TeamMeetFlat',
    'TeamMeetMono',
    'TeamMeetOutline'
  ];

  const option = options[Math.floor(Math.random() * options.length)];

  return (
    <>
      {option === 'Brain' && <Brainstorming className={className} />}
      {option === 'Startup' && <Brainstorming className={className} />}
      {option === 'StartupFlat' && <StartupFlat className={className} />}
      {option === 'StartupMono' && <StartupMono className={className} />}
      {option === 'TeamMeetFlat' && <TeamMeetingFlatLine className={className} />}
      {option === 'TeamMeetMono' && <TeamMeetingMono className={className} />}
      {option === 'TeamMeetOutline' && <TeamMeetingOutline className={className} />}
    </>
  );
}
