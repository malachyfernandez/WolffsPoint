import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import FontText from '../ui/text/FontText';
import { useMemoryPolicy } from '../../contexts/MemoryPressureContext';
import { readHeapPressure } from '../../utils/memoryTier';

/**
 * Opt-in memory telemetry badge. Renders nothing unless the URL contains
 * `?debugmem=1` (web only). Shows: device tier, current pressure, live heap
 * ratio where the engine exposes it, and the active culling policy.
 */
const MemoryDebugBadge = () => {
  const [visible] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('debugmem');
  });
  const { tier, pressure, policy, pinnedScopes } = useMemoryPolicy();
  const [heap, setHeap] = useState(() => readHeapPressure());

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setHeap(readHeapPressure()), 2000);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const heapLabel = heap
    ? `${Math.round(heap.ratio * 100)}% heap`
    : 'no heap API';

  return (
    <View
      style={{
        position: 'fixed' as any,
        bottom: 8,
        right: 8,
        zIndex: 2147483646,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.75)',
      }}
      pointerEvents="none">
      <FontText style={{ color: '#fff', fontSize: 10 }}>
        {`mem ${tier}/${pressure} | ${heapLabel} | hiddenTabs≤${
          policy.maxHiddenTabs === Infinity ? '∞' : policy.maxHiddenTabs
        } | snaps:${policy.keepMinimizedSnapshots ? 'on' : 'off'} | pinned:${pinnedScopes.size}`}
      </FontText>
    </View>
  );
};

export default MemoryDebugBadge;
