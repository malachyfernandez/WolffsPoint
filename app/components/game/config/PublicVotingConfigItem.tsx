import React from 'react';
import { Pressable } from 'react-native';
import { useValue } from '../../../../hooks/useData';
import { GameSchedule } from '../../../../types/multiplayer';
import {
  getGameScopedKey,
  normalizeGameSchedule,
  defaultGameSchedule,
} from '../../../../utils/multiplayer';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import CustomCheckbox from '../../ui/CustomCheckbox';
import FontText from '../../ui/text/FontText';

interface PublicVotingConfigItemProps {
  gameId: string;
}

/**
 * Configuration item for toggling public voting.
 * When enabled, players can see who voted for whom on the newspaper screen.
 */
const PublicVotingConfigItem = ({ gameId }: PublicVotingConfigItemProps) => {
  const [gameSchedule, setGameSchedule] = useValue<GameSchedule>(
    getGameScopedKey('gameSchedule', gameId),
    {
      defaultValue: defaultGameSchedule,
      privacy: 'PUBLIC',
    }
  );

  const schedule = normalizeGameSchedule(gameSchedule.value);
  const publicVoting = schedule.publicVoting ?? false;

  return (
    <ConfigSectionRow
      title="Public voting"
      subtext={
        publicVoting
          ? 'Players can see who voted for whom on the newspaper screen.'
          : 'Vote counts are shown, but individual votes are hidden.'
      }>
      <Pressable
        onPress={() =>
          setGameSchedule({
            ...schedule,
            publicVoting: !publicVoting,
          })
        }
        className="flex-row items-center gap-3">
        <CustomCheckbox
          checked={publicVoting}
          onChange={() =>
            setGameSchedule({
              ...schedule,
              publicVoting: !publicVoting,
            })
          }
          monochrome
        />
        <FontText className={publicVoting ? '' : 'opacity-70'}>
          {publicVoting ? 'Enabled' : 'Disabled'}
        </FontText>
      </Pressable>
    </ConfigSectionRow>
  );
};

export default PublicVotingConfigItem;
