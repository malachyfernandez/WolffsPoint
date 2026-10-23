import React, { useMemo, useState, useCallback, useEffect, startTransition } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import PlayerPageOPERATOR from './PlayerPageOPERATOR';
import RolesPageOPERATOR from './RolesPageOPERATOR';
import TownSquarePagePLAYER from './TownSquarePagePLAYER';
import NewspaperPageOPERATOR from './NewspaperPageOPERATOR';
import ConfigPageOPERATOR from './ConfigPageOPERATOR';
import FilesPageOPERATOR from './FilesPageOPERATOR';
import GameTabBar, { GameTabDefinition } from './GameTabBar';
import PlayersIcon from '../ui/icons/Players';
import RolesIcon from '../ui/icons/Roles';
import TownSquareIcon from '../ui/icons/TownSquare';
import NewspaperIcon from '../ui/icons/Newspaper';
import ConfigIcon from '../ui/icons/Config';
import FilesIcon from '../ui/icons/Files';
import PaperContainer from '../ui/PaperContainer';
import { BodyReportScope } from 'contexts/BodyReadinessContext';
import { PlayerProfile } from 'types/multiplayer';
import { PlayerStatusProvider } from 'contexts/PlayerStatusContext';
import { SimProfiler } from '../../sim/perf/SimProfiler';
import TabPane from '../layout/TabPane';
import { useBoundedMountedTabs } from '../../hooks/useBoundedMountedTabs';
import { useMinimize } from '../ui/minimize/MinimizeContext';
import { CellHighlightContext, type CellHighlightRequest } from './CellHighlight';
import type { FilePlacement } from '../../utils/scriptFiles';
import { nowMs } from 'utils/simNow';
import { useContentWidth } from 'hooks/useContentWidth';
import { useFileInputCleanup } from '../../hooks/useFileInputCleanup';
import FileEditorHost from './scriptFiles/FileEditorHost';
import { useCellModuleStatus } from '../../utils/legacySystems';
import { useToast } from '../../contexts/ToastContext';

export type OperatorTab = 'players' | 'config' | 'files' | 'forum' | 'newspaper' | 'rulebook';

interface OperatorGamePageProps {
  gameId: string;
  currentUserId: string;
}

const operatorTabs = (filesDisabled: boolean): GameTabDefinition<OperatorTab>[] => [
  { label: 'Players', condensedLabel: 'Players', value: 'players', icon: <PlayersIcon /> },
  { label: 'Roles', condensedLabel: 'Roles', value: 'config', icon: <RolesIcon /> },
  {
    label: 'Files',
    condensedLabel: 'Files',
    value: 'files',
    icon: <FilesIcon />,
    disabled: filesDisabled,
  },
  { label: 'Town Square', condensedLabel: 'Town Sq', value: 'forum', icon: <TownSquareIcon /> },
  { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <NewspaperIcon /> },
  { label: 'Config', condensedLabel: 'Config', value: 'rulebook', icon: <ConfigIcon /> },
];

const OperatorGamePage = ({ gameId, currentUserId }: OperatorGamePageProps) => {
  useFileInputCleanup(gameId);
  const [activeTab, setActiveTab] = useState<OperatorTab>('players');
  const { showToast } = useToast();
  // Script files only exist for games upgraded past the legacy systems.
  const { migrated, loading: moduleStatusLoading } = useCellModuleStatus(gameId);
  const filesDisabled = !moduleStatusLoading && !migrated;
  const tabs = useMemo(() => operatorTabs(filesDisabled), [filesDisabled]);
  const contentWidth = useContentWidth();
  // Tabs mount lazily on first visit (no upfront fetching for unopened tabs),
  // then stay mounted so dialog/minimize state survives tab switches, bounded
  // by device memory tier: under pressure the least-recently-active hidden
  // panes are evicted (they re-mount on revisit, same as first visit).
  const scopeIdForTab = useCallback((tab: OperatorTab) => `op-tab-${gameId}-${tab}`, [gameId]);
  const { removeByScope } = useMinimize();
  // An evicted pane kills its dialogs' restore closures, drop their
  // (non-pinned) minimized cards so no dead UI lingers in the minimize row.
  const onTabEvicted = useCallback(
    (tab: OperatorTab) => removeByScope(scopeIdForTab(tab)),
    [removeByScope, scopeIdForTab]
  );
  const mountedTabs = useBoundedMountedTabs(activeTab, scopeIdForTab, onTabEvicted);

  const handleTabPress = useCallback(
    (tab: OperatorTab) => {
      if (tab === 'files' && filesDisabled) {
        showToast('Files unlock after upgrading this game - see "Upgrade to files" in Config.');
        return;
      }
      // Non-urgent update: keeps taps responsive while a heavy cold tab mounts.
      startTransition(() => {
        setActiveTab(tab);
      });
    },
    [filesDisabled, showToast]
  );

  // Files-tab placement chips deep-link: morning-message cells land on the
  // Players tab (morning column), role/vote cells on Roles. The target rides
  // a context so the destination cell can flash + scroll into view once the
  // tab (and its rows) are mounted: 10s covers cold-mount loading.
  const [cellTarget, setCellTarget] = useState<CellHighlightRequest | null>(null);
  useEffect(() => {
    if (!cellTarget) return;
    const timer = setTimeout(() => setCellTarget(null), 10000);
    return () => clearTimeout(timer);
  }, [cellTarget]);
  const handleNavigateTab = useCallback(
    (tab: 'config' | 'players', placement?: FilePlacement) => {
      if (placement?.kind === 'cell') {
        setCellTarget({
          cellKind: placement.cellKind ?? 'roleMessage',
          targetKey: placement.targetKey,
          day: placement.day,
          nonce: nowMs(),
        });
      }
      handleTabPress(tab);
    },
    [handleTabPress]
  );

  // Create operator profile for TownSquare, memoized: a fresh object identity
  // every render re-renders the forum subtree even while hidden.
  const profile: PlayerProfile = useMemo(
    () => ({
      gameId,
      email: 'operator@game.local',
      userId: currentUserId,
      inGameName: 'Game Operator',
      profileImageUrl: '',
      phoneNumber: '',
      instagram: '',
      discord: '',
      otherContact: '',
      bioMarkdown: 'Game operator account',
      claimedAt: nowMs(),
    }),
    [gameId, currentUserId]
  );

  return (
    <PlayerStatusProvider isPlayerDead={false}>
      {/* File editors live above the tab panes: they survive tab switches,
       *  stack without limit, and minimize into the global minimize row. */}
      <FileEditorHost gameId={gameId}>
        <Column className={`w-full ${contentWidth >= 640 ? 'gap-5' : 'gap-4'}`}>
          <GameTabBar activeTab={activeTab} onTabPress={handleTabPress} tabs={tabs} />
          <SimProfiler id="op-tabs">
            <PaperContainer>
              <View className="w-full min-w-0">
                <CellHighlightContext.Provider value={cellTarget}>
                  <TabPane
                    active={activeTab === 'players'}
                    mounted={mountedTabs.has('players')}
                    scopeId={scopeIdForTab('players')}>
                    <BodyReportScope enabled={activeTab === 'players'}>
                      <PlayerPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
                    </BodyReportScope>
                  </TabPane>
                  <TabPane
                    active={activeTab === 'config'}
                    mounted={mountedTabs.has('config')}
                    scopeId={scopeIdForTab('config')}>
                    <BodyReportScope enabled={activeTab === 'config'}>
                      <RolesPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
                    </BodyReportScope>
                  </TabPane>
                  <TabPane
                    active={activeTab === 'files'}
                    mounted={mountedTabs.has('files')}
                    scopeId={scopeIdForTab('files')}>
                    <BodyReportScope enabled={activeTab === 'files'}>
                      <FilesPageOPERATOR gameId={gameId} onNavigateTab={handleNavigateTab} />
                    </BodyReportScope>
                  </TabPane>
                  <TabPane
                    active={activeTab === 'forum'}
                    mounted={mountedTabs.has('forum')}
                    scopeId={scopeIdForTab('forum')}>
                    <BodyReportScope enabled={activeTab === 'forum'}>
                      <TownSquarePagePLAYER gameId={gameId} currentProfile={profile} />
                    </BodyReportScope>
                  </TabPane>
                  <TabPane
                    active={activeTab === 'newspaper'}
                    mounted={mountedTabs.has('newspaper')}
                    scopeId={scopeIdForTab('newspaper')}>
                    <BodyReportScope enabled={activeTab === 'newspaper'}>
                      <NewspaperPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
                    </BodyReportScope>
                  </TabPane>
                  <TabPane
                    active={activeTab === 'rulebook'}
                    mounted={mountedTabs.has('rulebook')}
                    scopeId={scopeIdForTab('rulebook')}>
                    <BodyReportScope enabled={activeTab === 'rulebook'}>
                      <ConfigPageOPERATOR gameId={gameId} currentUserId={currentUserId} />
                    </BodyReportScope>
                  </TabPane>
                </CellHighlightContext.Provider>
              </View>
            </PaperContainer>
          </SimProfiler>
        </Column>
      </FileEditorHost>
    </PlayerStatusProvider>
  );
};

export default OperatorGamePage;
