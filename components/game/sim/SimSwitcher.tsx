import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  ChevronRight,
  Ghost,
  Monitor,
} from 'lucide-react-native';
import Column from '../../layout/Column';
import ShadowScrollView from '../../ui/ShadowScrollView';
import FontText from '../../ui/text/FontText';
import { useValue } from 'hooks/useData';
import { useSimSetup } from 'hooks/useSimSetup';
import { WebDropdownPortal } from 'contexts/WebDropdownProvider';
import { setSidebarWidth } from 'utils/sidebarWidth';
import {
  defaultSimSession,
  personaIdForEmail,
  simSessionKey,
  type SimSession,
} from 'utils/simUtils';
import type { UserTableItem } from 'types/playerTable';

interface SimSwitcherProps {
  gameId: string;
  isOperator: boolean;
  /** Persisted by MainPage (game-scoped useValue) so the rail state survives reloads. */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const SIM_PURPLE = '#8a6fc0';
const RAIL_WIDTH = 52;
const PANEL_WIDTH = 224;

/**
 * The persona switcher: a Discord-style left sidebar that sits in layout flow,
 * so the whole game screen shifts/shrinks as it expands. Collapsed it is an
 * icon rail (operator + persona glyphs only); expanded it shows the full list
 * with names. Before a simulation exists its only entry starts one; while the
 * sim is paused it swaps to Enter/End session actions.
 */
const SimSwitcher = ({ gameId, isOperator, expanded, onExpandedChange }: SimSwitcherProps) => {
  const [sessionRecord, setSession] = useValue<SimSession>(simSessionKey(gameId), {
    defaultValue: defaultSimSession,
    privacy: 'PUBLIC',
  });
  const session = sessionRecord?.value ?? defaultSimSession;
  const { seedPersona, simRoster } = useSimSetup(gameId);
  // Floating tooltip for the collapsed rail: hovered item reports its glyph
  // rect and the label is portaled at viewport level so nothing clips it.
  const [tip, setTip] = useState<{
    title: string;
    sub?: string;
    top: number;
    left: number;
  } | null>(null);

  const simActive = session.enabled && session.view !== 'operator';

  const personas = useMemo(() => simRoster ?? [], [simRoster]);

  // Below the Tailwind `sm` viewport width the screen is too small to give up
  // 224px - the expanded panel becomes an overlay on top of the page with a
  // darkened backdrop instead of shrinking the content. Only the 52px rail
  // stays in layout flow. Viewport width is used on purpose: deciding off
  // content width would feed back into itself via the width we publish.
  const { width: viewportWidth } = useWindowDimensions();
  const overlayExpand = viewportWidth < 640;

  // Publish the claimed width so game-area breakpoints (useContentWidth)
  // shrink alongside the content instead of tracking the raw viewport.
  // useLayoutEffect keeps the publish before first paint, so consumers never
  // render a frame at the wrong width.
  useLayoutEffect(() => {
    const claimsSpace = isOperator && gameId && simActive;
    const inFlowWidth =
      expanded && !overlayExpand ? PANEL_WIDTH : RAIL_WIDTH;
    setSidebarWidth(claimsSpace ? inFlowWidth : 0);
    return () => setSidebarWidth(0);
  }, [expanded, overlayExpand, isOperator, gameId, simActive]);

  if (!isOperator || !gameId) return null;

  const updateSession = (next: Partial<SimSession>) =>
    setSession({ ...session, ...next });

  const handleViewPersona = (player: UserTableItem) => {
    // Swap views synchronously so the old screen disappears on click; the
    // persona seed writes happen in the background while it loads.
    updateSession({
      view: 'persona',
      personaId: personaIdForEmail(player.email),
      personaName: player.realName,
    });
    void seedPersona(player);
  };

  // No active sim (not started yet, or paused on the live operator view):
  // there's nothing to switch between, so the sidebar disappears entirely.
  // The start/enter/end session actions live inline in TopSiteBar instead
  // (SimTopActions).
  if (!simActive) return null;

  const personaIcon = (player: UserTableItem, size: number, textSize: string) => {
    const dead = player.playerData?.livingState === 'dead';
    return dead ? (
      <Ghost size={size} color="rgba(255,255,255,0.5)" />
    ) : (
      <View
        className="items-center justify-center rounded-full"
        style={{ width: size + 6, height: size + 6, backgroundColor: SIM_PURPLE }}>
        <FontText weight="bold" className={`${textSize} text-white`}>
          {player.realName[0] ?? '?'}
        </FontText>
      </View>
    );
  };

  // The expanded persona/collapse list - shared between the in-flow panel
  // (wide screens) and the overlay panel (narrow screens).
  const panel = (
    <Column className="h-full p-1.5">
          <ShadowScrollView className="flex-1" scrollViewClassName="flex-1">
            <Column className="gap-0.5">
            <>
              <MenuItem
                icon={<Monitor size={13} color="#d9b458" />}
                label="Operator"
                sub="simulated operator - full controls"
                checked={session.view === 'console'}
                onPress={() =>
                  updateSession({ view: 'console', personaId: undefined, personaName: undefined })
                }
              />
              {personas.map((player) => {
                const pid = personaIdForEmail(player.email);
                const isCurrent =
                  session.view === 'persona' && session.personaId === pid;
                const dead = player.playerData?.livingState === 'dead';
                return (
                  <MenuItem
                    key={player.email}
                    icon={personaIcon(player, 11, 'text-[9px]')}
                    label={player.realName}
                    sub={`${player.role || 'UNSET'} · ${dead ? 'dead' : 'alive'}`}
                    checked={isCurrent}
                    dim={dead}
                    onPress={() => handleViewPersona(player)}
                  />
                );
              })}
              {personas.length === 0 && (
                <FontText className="px-3 py-2 text-[11px] text-white/45">
                  No simulated players yet
                </FontText>
              )}
            </>
            </Column>
          </ShadowScrollView>
          {/* Overlay mode collapses via the backdrop tap or the rail's
           *  chevron, so the COLLAPSE row only renders in-flow. */}
          {!overlayExpand && (
            <>
              <View className="mx-1.5 my-1 h-px bg-white/10" />
              <Pressable
                onPress={() => onExpandedChange(false)}
                className="flex-row items-center gap-2.5 rounded-md px-3 py-2 hover:bg-white/10">
                <ChevronLeft size={13} color="rgba(255,255,255,0.6)" />
                <FontText
                  className="text-[10px] uppercase tracking-wider"
                  color="rgba(255,255,255,0.6)">
                  Collapse
                </FontText>
              </Pressable>
            </>
          )}
        </Column>
  );

  // In overlay mode the rail is always what sits in layout flow, even while
  // the expanded panel floats over the page - so its bottom control flips to
  // a collapse chevron.
  const railVisible = !expanded || overlayExpand;

  return (
    <>
    <View
      className="h-full border-r"
      style={{
        width: expanded && !overlayExpand ? PANEL_WIDTH : RAIL_WIDTH,
        borderColor: 'rgba(138,111,192,0.5)',
        backgroundColor: 'rgba(26,20,38,0.72)',
      }}>
      <BlurView intensity={20} className="h-full flex-1">
      {railVisible ? (
        /* Icon rail: glyphs only, same selection semantics as the list. The
         *  glyph list scrolls when personas overflow; the expand chevron is
         *  pinned below it. */
        <Column className="h-full items-center px-1 py-2">
          <ShadowScrollView className="w-full flex-1" scrollViewClassName="flex-1">
            <Column className="items-center gap-1">
            <>
              <RailItem
                icon={<Monitor size={15} color="#d9b458" />}
                tooltip={{ title: 'Operator', sub: 'simulated operator - full controls' }}
                onTip={setTip}
                selected={session.view === 'console'}
                onPress={() =>
                  updateSession({ view: 'console', personaId: undefined, personaName: undefined })
                }
              />
              {personas.map((player) => {
                const pid = personaIdForEmail(player.email);
                const isCurrent =
                  session.view === 'persona' && session.personaId === pid;
                const dead = player.playerData?.livingState === 'dead';
                return (
                  <RailItem
                    key={player.email}
                    icon={personaIcon(player, 13, 'text-[10px]')}
                    tooltip={{
                      title: player.realName,
                      sub: `${player.role || 'UNSET'} · ${dead ? 'dead' : 'alive'}`,
                    }}
                    onTip={setTip}
                    selected={isCurrent}
                    dim={dead}
                    onPress={() => handleViewPersona(player)}
                  />
                );
              })}
            </>
            </Column>
          </ShadowScrollView>
          <RailItem
            icon={
              expanded ? (
                <ChevronLeft size={15} color="rgba(255,255,255,0.6)" />
              ) : (
                <ChevronRight size={15} color="rgba(255,255,255,0.6)" />
              )
            }
            tooltip={{ title: expanded ? 'Collapse' : 'Expand' }}
            onTip={setTip}
            onPress={() => onExpandedChange(!expanded)}
          />
        </Column>
      ) : (
        panel
      )}
      </BlurView>
    </View>
    {expanded && overlayExpand && (
      /* Narrow screens: the expanded panel can't claim 224px of layout, so it
       *  floats on top of the page over a darkened backdrop instead. Absolute
       *  siblings of the rail - fragments flatten, so these position against
       *  the same content container as the top-right float buttons. */
      <>
        <Pressable
          onPress={() => onExpandedChange(false)}
          className="absolute bottom-0 right-0 top-0"
          style={{ left: RAIL_WIDTH, zIndex: 70 }}>
          <BlurView
            intensity={20}
            tint="dark"
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
          />
        </Pressable>
        <View
          className="absolute bottom-0 top-0 border-r"
          style={{
            left: RAIL_WIDTH,
            width: PANEL_WIDTH,
            borderColor: 'rgba(138,111,192,0.5)',
            backgroundColor: 'rgba(26,20,38,0.72)',
            zIndex: 71,
          }}>
          <BlurView intensity={20} className="h-full flex-1">
            {panel}
          </BlurView>
        </View>
      </>
    )}
    {tip && railVisible && (
      <WebDropdownPortal>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: tip.top,
            left: tip.left,
            transform: 'translateY(-50%)',
          }}>
          <View
            className="rounded-md border px-2.5 py-1.5"
            style={{
              borderColor: 'rgba(138,111,192,0.6)',
              backgroundColor: 'rgba(26,20,38,0.95)',
            }}>
            <FontText
              weight="bold"
              className="text-[12px] leading-4 text-white"
              style={{ whiteSpace: 'nowrap' } as any}>
              {tip.title}
            </FontText>
            {tip.sub ? (
              <FontText
                className="text-[9px] leading-3 text-white/55"
                style={{ whiteSpace: 'nowrap' } as any}>
                {tip.sub}
              </FontText>
            ) : null}
          </View>
        </View>
      </WebDropdownPortal>
    )}
    </>
  );
};

/** A single glyph button in the collapsed rail. On hover it measures its own
 *  DOM rect and reports up so the parent can float a portal tooltip to the
 *  right of the rail - escaping any overflow clipping. */
const RailItem = ({
  icon,
  onPress,
  selected,
  dim,
  tooltip,
  onTip,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  dim?: boolean;
  tooltip?: { title: string; sub?: string };
  onTip?: (tip: { title: string; sub?: string; top: number; left: number } | null) => void;
}) => {
  const ref = useRef<any>(null);
  const showTip = () => {
    if (!tooltip || !onTip) return;
    const rect = (ref.current as HTMLElement | null)?.getBoundingClientRect?.();
    if (!rect) return;
    onTip({ ...tooltip, top: rect.top + rect.height / 2, left: rect.right + 10 });
  };
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onHoverIn={showTip}
      onHoverOut={() => onTip?.(null)}
      className={`h-10 w-10 items-center justify-center rounded-md ${
        selected ? 'bg-[#8a6fc0]/40' : 'hover:bg-white/10'
      }`}
      style={dim ? { opacity: 0.55 } : undefined}>
      {icon}
    </Pressable>
  );
};

const MenuItem = ({
  icon,
  label,
  sub,
  onPress,
  checked,
  dim,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onPress: () => void;
  checked?: boolean;
  dim?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    className={`flex-row items-center gap-2.5 rounded-md px-3 py-2 ${
      checked ? 'bg-[#8a6fc0]/40' : 'hover:bg-white/10'
    }`}
    style={dim ? { opacity: 0.55 } : undefined}>
    {icon}
    {/* Web-only CSS mask: overflowing text fades off the right edge instead
     *  of wrapping or ellipsizing. */}
    <View
      className="flex-1 overflow-hidden"
      style={
        {
          maskImage: 'linear-gradient(to right, black 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent)',
        } as any
      }>
      <FontText
        weight="bold"
        className="text-[12px] leading-4 text-white"
        style={{ whiteSpace: 'nowrap' } as any}>
        {label}
      </FontText>
      {sub ? (
        <FontText
          className="text-[9px] leading-3 text-white/55"
          style={{ whiteSpace: 'nowrap' } as any}>
          {sub}
        </FontText>
      ) : null}
    </View>
  </Pressable>
);

export default SimSwitcher;
