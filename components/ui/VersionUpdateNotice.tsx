import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DevSettings, Platform, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { RefreshCw } from 'lucide-react-native';
import { useAppVersionStatus } from '../../hooks/useAppVersionStatus';
import Column from '../layout/Column';
import Row from '../layout/Row';
import GuildedFrame from './chrome/GuildedFrame';
import GuildedButton from './buttons/GuildedButton';
import FontText from './text/FontText';

const CARD_WIDTH = 240;
const DOCK_SELECTOR = '[data-minimize-dock]';

/**
 * Reloads the app so the client picks up the newest deployed bundle.
 * On web this is a full page reload; on native it uses the dev reloader
 * (a no-op in production builds without expo-updates).
 */
const reloadApp = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.reload();
    return;
  }
  DevSettings.reload();
};

/**
 * Measures the height of the minimize-dialog dock (`MinimizeRow`, marked with
 * `data-minimize-dock`) so this overlay can sit directly above it instead of
 * overlapping. Returns 0 when the dock isn't rendered.
 *
 * Markup-level coupling only — no minimize-system state is shared.
 */
const useDialogDockHeight = (enabled: boolean) => {
  const [dockHeight, setDockHeight] = useState(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof document === 'undefined') return;

    let current: Element | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const attach = () => {
      const el = document.querySelector(DOCK_SELECTOR);
      if (el === current) return;
      current = el;
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (el) {
        setDockHeight(el.getBoundingClientRect().height);
        resizeObserver = new ResizeObserver((entries) => {
          setDockHeight(entries[0]?.contentRect.height ?? 0);
        });
        resizeObserver.observe(el);
      } else {
        setDockHeight(0);
      }
    };

    attach();
    // The dock mounts/unmounts as dialogs are minimized — watch for it.
    const mutationObserver = new MutationObserver(attach);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
    };
  }, [enabled]);

  return enabled ? dockHeight : 0;
};

interface NoticeCardProps {
  clientVersion: number;
  latestVersion: number | null;
  onMinimize: () => void;
}

/**
 * The expanded version notice: a guilded-frame card matching the app's
 * paper/gold aesthetic, with a "−" minimize button and a Reload button.
 */
const NoticeCard = ({ clientVersion, latestVersion, onMinimize }: NoticeCardProps) => (
  <View style={{ width: CARD_WIDTH }}>
    <GuildedFrame className="w-full" contentClassName="p-4" backgroundToken="inner-background">
      <Column className="gap-2">
        <Row className="w-full items-center justify-between">
          <FontText variant="cardHeader" color="text">
            Update available
          </FontText>
          <Pressable
            onPress={onMinimize}
            accessibilityRole="button"
            accessibilityLabel="Minimize update notice"
            className="bg-text/10 hover:bg-text/15 h-7 w-7 items-center justify-center rounded-full">
            <FontText color="text" weight="bold" className="text-base leading-none">
              −
            </FontText>
          </Pressable>
        </Row>

        <FontText color="text" className="text-sm">
          A new version of WolffsPoint is ready. Reload to get the latest changes.
        </FontText>

        {latestVersion !== null && (
          <FontText variant="subtext" color="text">
            You&apos;re on v{clientVersion} — latest is v{latestVersion}.
          </FontText>
        )}

        <Row className="w-full pt-1">
          <GuildedButton
            onPress={reloadApp}
            variant="gold"
            background="#2f2f2f"
            height={40}
            contentPaddingX={14}
            contentPaddingY={0}
            className="w-full">
            <Row className="h-full w-full items-center justify-center gap-2" pointerEvents="none">
              <RefreshCw size={14} color="rgb(246, 238, 219)" />
              <FontText color="text-inverted" weight="medium">
                Reload
              </FontText>
            </Row>
          </GuildedButton>
        </Row>
      </Column>
    </GuildedFrame>
  </View>
);

interface MinimizedPillProps {
  onExpand: () => void;
}

/**
 * The "single small thing" the notice shrinks into — styled after the
 * minimize row's Hide/Show pills.
 */
const MinimizedPill = ({ onExpand }: MinimizedPillProps) => (
  <Pressable
    onPress={onExpand}
    accessibilityRole="button"
    accessibilityLabel="Show update notice"
    className="border-border bg-background flex-row items-center gap-1 rounded-lg border px-2.5 py-1 shadow-md">
    <RefreshCw size={14} color="rgb(46, 41, 37)" />
    <FontText weight="medium" className="text-xs">
      Update
    </FontText>
  </Pressable>
);

/**
 * Bottom-left "new version available" overlay.
 *
 * - Appears when the server's `latestClientVersion` global is higher than the
 *   bundled `CLIENT_VERSION` (see `useAppVersionStatus`).
 * - Stays on screen until the user reloads.
 * - The "−" button shrinks the card down into a small "Update" pill (modeled
 *   on the minimize row's Hide/Show pills); tapping it expands the card again.
 * - Rendered via its own portal to `document.body` so ancestor CSS transforms
 *   can't break `position: fixed`, and stacked above the minimize-dialog dock
 *   when dialogs are minimized.
 *
 * Render this once at the app level (root layout).
 */
const VersionUpdateNotice = () => {
  const { isOutdated, clientVersion, latestVersion } = useAppVersionStatus();
  const [isMinimized, setIsMinimized] = useState(false);
  const dockHeight = useDialogDockHeight(isOutdated);

  if (!isOutdated) return null;

  const content = isMinimized ? (
    <Animated.View
      key="pill"
      entering={FadeInDown.duration(140)}
      exiting={FadeOutDown.duration(120)}>
      <MinimizedPill onExpand={() => setIsMinimized(false)} />
    </Animated.View>
  ) : (
    <Animated.View
      key="card"
      entering={FadeInDown.springify().damping(17).stiffness(260)}
      exiting={FadeOutDown.duration(140)}
      style={{ flexShrink: 0 }}>
      <NoticeCard
        clientVersion={clientVersion}
        latestVersion={latestVersion}
        onMinimize={() => setIsMinimized(true)}
      />
    </Animated.View>
  );

  // Native: plain absolute-positioned overlay in the RN tree.
  if (Platform.OS !== 'web') {
    return (
      <View style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 9999, elevation: 24 }}>
        {content}
      </View>
    );
  }

  // Web: fixed overlay portaled to document.body, lifted above the
  // minimize-dialog dock (bottom: 0) so the two never overlap.
  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: dockHeight,
        left: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        boxSizing: 'border-box',
        alignItems: 'flex-start',
        pointerEvents: 'none',
        transition: 'bottom 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
      <div style={{ pointerEvents: 'auto' }}>{content}</div>
    </div>,
    document.body
  );
};

export default VersionUpdateNotice;
