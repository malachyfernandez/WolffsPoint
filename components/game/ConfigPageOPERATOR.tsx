import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import FontText from '../ui/text/FontText';
import { useValue, useList } from 'hooks/useData';
import { useScriptFiles } from 'hooks/useScriptFiles';
import { RuleBookData } from 'types/ruleBook';
import { RoleTableItem } from 'types/roleTable';
import { getGameScopedKey } from 'utils/multiplayer';
import { useCellModuleStatus } from 'utils/legacySystems';
import { parseDisplayComposition, normalizeFilePath } from 'utils/scriptFiles';
import { getFolderCallParts, selectFolderFiles } from 'utils/scriptFolders';
import { ABOUT_ROLE_FOLDER } from 'utils/scriptFolderIdentity';
import type { Statement } from 'script/lang/ast';
import { useContentWidth } from 'hooks/useContentWidth';
import ActionDeadlineConfigItem from './config/ActionDeadlineConfigItem';
import DayModeConfigItem from './config/DayModeConfigItem';
import TimezoneConfigItem from './config/TimezoneConfigItem';
import VoteDeadlineConfigItem from './config/VoteDeadlineConfigItem';
import WakeUpTimeConfigItem from './config/WakeUpTimeConfigItem';
import DaysPerGameDayConfigItem from './config/DaysPerGameDayConfigItem';
import NewserConfigItem from './config/NewserConfigItem';
import GameNameConfigItem from './config/GameNameConfigItem';
import PublicVotingConfigItem from './config/PublicVotingConfigItem';
import LegacySystemsConfigItem from './config/LegacySystemsConfigItem';
import RuleBookPageOPERATOR from './RuleBookPageOPERATOR';
import PhoneBookPageOPERATOR from './PhoneBookPageOPERATOR';
import RemoveGameButton from './RemoveGameButton';
import DownloadPlayerDataButton from './DownloadPlayerDataButton';
import DownloadNewspaperButton from './DownloadNewspaperButton';

interface ConfigPageOPERATORProps {
  gameId: string;
  currentUserId: string;
}

type ConfigPageScreenState = 'config' | 'ruleBook' | 'phoneBook';

interface RuleBookPreviewCardProps {
  gameId: string;
  onPress: () => void;
}

const RuleBookPreviewCard = ({ gameId, onPress }: RuleBookPreviewCardProps) => {
  const [ruleBookData] = useValue<RuleBookData>(getGameScopedKey('ruleBook', gameId), {
    defaultValue: { content: '', roleOrder: [] },
    privacy: 'PUBLIC',
  });
  const [roleTable] = useList<RoleTableItem[]>('roleTable', gameId, { privacy: 'PUBLIC' });
  const filesApi = useScriptFiles(gameId);
  const { displayModules } = useCellModuleStatus(gameId);
  const activeSource = displayModules
    ? (ruleBookData?.value?.modularContent ?? '')
    : (ruleBookData?.value?.content ?? '');

  const previewText = React.useMemo(() => {
    if (displayModules) {
      return activeSource.trim() ? filesApi.previewText(activeSource) : 'No rule book written yet.';
    }
    const rawContent = activeSource;
    const flattenedContent = rawContent
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/[`*_>#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!flattenedContent.length) {
      return 'No rule book written yet.';
    }

    return flattenedContent.length > 180
      ? `${flattenedContent.slice(0, 180).trim()}...`
      : flattenedContent;
  }, [activeSource, displayModules, filesApi]);

  const visibleRoleDescriptionCount = React.useMemo(() => {
    if (displayModules) {
      const ids = new Set<string>();
      const visit = (statements: Statement[]) => {
        for (const statement of statements) {
          const folder = getFolderCallParts(statement);
          if (
            folder &&
            (folder.id === 'folder_about_role' ||
              normalizeFilePath(folder.path ?? '').toLowerCase() ===
                ABOUT_ROLE_FOLDER.toLowerCase())
          ) {
            for (const file of selectFolderFiles(filesApi.index, folder).files) ids.add(file.id);
          }
          if (
            statement.kind === 'NavButtonStatement' ||
            statement.kind === 'DisplayGroupStatement'
          ) {
            visit(statement.body.statements);
          }
        }
      };
      visit(parseDisplayComposition(activeSource) ?? []);
      return ids.size;
    }
    return (roleTable?.value ?? []).filter(
      (role) =>
        role.isVisible !== false &&
        role.hiddenFromRulebook !== true &&
        role.aboutRole?.trim().length
    ).length;
  }, [activeSource, displayModules, filesApi.index, roleTable?.value]);

  return (
    <Pressable
      testID="config-open-rulebook"
      onPress={onPress}
      className="bg-text/5 w-full rounded-3xl px-4 py-4">
      <Row className="items-start gap-4">
        <Column className="flex-1 gap-1">
          <FontText weight="medium">Rule book</FontText>
          <FontText variant="subtext">{previewText}</FontText>
          <FontText variant="subtext">
            {visibleRoleDescriptionCount} role description
            {visibleRoleDescriptionCount === 1 ? '' : 's'}
          </FontText>
        </Column>
        <ChevronRight size={20} color="rgb(46, 41, 37)" className="mt-1" />
      </Row>
    </Pressable>
  );
};

interface PhoneBookPreviewCardProps {
  gameId: string;
  currentUserId: string;
  onPress: () => void;
}

const PhoneBookPreviewCard = ({ gameId, currentUserId, onPress }: PhoneBookPreviewCardProps) => {
  const [userTable] = useList<any[]>('userTable', gameId, { privacy: 'PUBLIC' });

  const playerCount = (userTable?.value ?? []).filter(
    (user: any) => user.userId !== currentUserId
  ).length;

  return (
    <Pressable
      testID="config-open-phonebook"
      onPress={onPress}
      className="bg-text/5 w-full rounded-3xl px-4 py-4">
      <Row className="items-start gap-4">
        <Column className="flex-1 gap-1">
          <FontText weight="medium">Phone book</FontText>
          <FontText variant="subtext">
            {playerCount} player{playerCount === 1 ? '' : 's'} in the game
          </FontText>
        </Column>
        <ChevronRight size={20} color="rgb(46, 41, 37)" className="mt-1" />
      </Row>
    </Pressable>
  );
};

/**
 * Main configuration page for operators.
 * Contains game schedule settings and provides access to the rule book editor.
 */
const ConfigPageOPERATOR = ({ gameId, currentUserId }: ConfigPageOPERATORProps) => {
  const [activeScreen, setActiveScreen] = useState<ConfigPageScreenState>('config');
  const contentWidth = useContentWidth();

  return (
    <Column className={`min-h-190 flex-1 gap-0 py-3 ${contentWidth >= 640 ? 'px-4' : ''}`}>
      <LayoutStateAnimatedView.Container stateVar={activeScreen} className="flex-1">
        <LayoutStateAnimatedView.Option page={1} stateValue="config">
          <Column className="gap-6 pb-6">
            <RuleBookPreviewCard gameId={gameId} onPress={() => setActiveScreen('ruleBook')} />
            <PhoneBookPreviewCard
              gameId={gameId}
              currentUserId={currentUserId}
              onPress={() => setActiveScreen('phoneBook')}
            />

            <Column className="border-border/15 items-center gap-3 border-t pt-6">
              <FontText weight="medium">Export game data</FontText>
              <Row className="w-full flex-wrap gap-4">
                <Column className="min-w-75 flex-1 items-center gap-2">
                  <FontText variant="subtext" className="text-center">
                    Downloads the full table from the nightly and players pages for all days.
                  </FontText>
                  <DownloadPlayerDataButton gameId={gameId} />
                </Column>
                <Column className="min-w-75 flex-1 items-center gap-2">
                  <FontText variant="subtext" className="text-center">
                    Downloads each day’s newspaper columns as markdown files in a zip.
                  </FontText>
                  <DownloadNewspaperButton gameId={gameId} />
                </Column>
              </Row>
            </Column>

            <Column className="border-border/15 gap-0 border-y">
              <DayModeConfigItem gameId={gameId} />
              <TimezoneConfigItem gameId={gameId} />
              <DaysPerGameDayConfigItem gameId={gameId} />
              <ActionDeadlineConfigItem gameId={gameId} />
              <VoteDeadlineConfigItem gameId={gameId} />
              <WakeUpTimeConfigItem gameId={gameId} />
              <NewserConfigItem gameId={gameId} />
              <GameNameConfigItem gameId={gameId} />
              <PublicVotingConfigItem gameId={gameId} />
              <LegacySystemsConfigItem gameId={gameId} />
            </Column>

            <RemoveGameButton gameId={gameId} />
          </Column>
        </LayoutStateAnimatedView.Option>

        <LayoutStateAnimatedView.OptionContainer page={2} pushInAnimation={fromRight}>
          <LayoutStateAnimatedView.Option stateValue="ruleBook">
            <RuleBookPageOPERATOR gameId={gameId} onBack={() => setActiveScreen('config')} />
          </LayoutStateAnimatedView.Option>
          <LayoutStateAnimatedView.Option stateValue="phoneBook">
            <PhoneBookPageOPERATOR
              gameId={gameId}
              currentUserId={currentUserId}
              onBack={() => setActiveScreen('config')}
            />
          </LayoutStateAnimatedView.Option>
        </LayoutStateAnimatedView.OptionContainer>
      </LayoutStateAnimatedView.Container>
    </Column>
  );
};

export default ConfigPageOPERATOR;
