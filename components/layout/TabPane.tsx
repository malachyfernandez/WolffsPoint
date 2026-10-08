import React from 'react';
import { Platform, View } from 'react-native';
import { MemoryScope } from '../../contexts/MemoryPressureContext';

interface TabPaneProps {
  /** Whether this pane is the visible tab. */
  active: boolean;
  /** Whether the pane's subtree should be mounted at all (lazy mount / LRU eviction). */
  mounted: boolean;
  /** MemoryScope id — minimized dialogs inside this pane register here so the
   *  pane is never evicted while it owns unsaved dialog state. */
  scopeId: string;
  children: React.ReactNode;
}

/**
 * A keep-alive tab pane.
 *
 * On web, hidden panes stay *laid out* instead of `display:none`: switching
 * back is a paint flip rather than a full style/layout rebuild of thousands
 * of DOM nodes (measured 150–800ms per warm revisit with display:none).
 * `position:absolute` takes the pane out of flow so it doesn't affect the
 * document or the active pane's layout.
 *
 * Hiding uses `opacity:0 + translateX(-99999)` rather than `visibility:hidden`
 * — react-native-web's style compiler drops `visibility`, which left every
 * pane painting stacked on top of each other. `pointerEvents:'none'` alone is
 * also insufficient: children that set their own `pointer-events:auto`
 * (hover-reveal pills, buttons) re-enable hit-testing inside a hidden pane.
 * Translating the pane fully off-viewport is the only guarantee — no child
 * can be hovered, focused, or painted on screen no matter what it sets.
 *
 * On native, `display:none` is retained — RN doesn't pay DOM layout costs and
 * hidden subtrees behave identically.
 */
const TabPane = ({ active, mounted, scopeId, children }: TabPaneProps) => {
  const hiddenStyle =
    Platform.OS === 'web'
      ? ({
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          opacity: 0,
          zIndex: -1,
          transform: [{ translateX: -99999 }],
        } as const)
      : ({ display: 'none' } as const);

  const activeStyle =
    Platform.OS === 'web' ? ({ position: 'relative' } as const) : ({ display: 'flex' } as const);

  return (
    <View
      style={active ? activeStyle : hiddenStyle}
      pointerEvents={active ? 'auto' : 'none'}
      className="w-full min-w-0">
      <MemoryScope id={scopeId}>{mounted ? children : null}</MemoryScope>
    </View>
  );
};

export default TabPane;
