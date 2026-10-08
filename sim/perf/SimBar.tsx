/**
 * sim/perf/SimBar.tsx
 *
 * Fixed top-center control bar for the perf-audit copy. Hosts:
 *  - "Simulate Everything" — runs the full scripted tour
 *  - live progress + cancel
 *  - "Modal Lab" — opens the dialog test bench
 *  - "Report .md" — re-exports the last (or current) measurements
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import ModalLab from './ModalLab';
import { runFullTour, cancelTour } from './runTour';
import { buildMarkdownReport, downloadMarkdown } from './report';
import { mockDb } from '../mockDb';
import { perfLog } from './log';
import { simUi, useSimUi } from './uiState';

export default function SimBar() {
  const ui = useSimUi();
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    simUi.set({ tourRunning: true, tourProgress: 'starting…', labOpen: false });
    try {
      await runFullTour((p) => simUi.set({ tourProgress: `${p.done}/${p.total} — ${p.label}` }));
    } catch (e) {
      simUi.set({ tourProgress: `stopped: ${e instanceof Error ? e.message : e}` });
    } finally {
      setBusy(false);
      simUi.set({ tourRunning: false });
    }
  };

  const exportNow = () => {
    const md =
      ui.lastReport ??
      buildMarkdownReport({
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        hardwareConcurrency: (navigator as any).hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        queryLatencyMs: mockDb.queryLatencyMs,
        startedAtIso: new Date().toISOString(),
        durationMs: 0,
      });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadMarkdown(`wolffspoint-perf-${stamp}.md`, md);
  };

  if (collapsed) {
    return (
      <>
        <ModalLab />
        <View style={{ position: 'fixed' as any, top: 6, right: 8, zIndex: 99999 }}>
          <Pressable
            testID="sim-expand"
            onPress={() => setCollapsed(false)}
            style={{ backgroundColor: '#17151cee', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#4a4258' }}>
            <Text style={{ color: '#efe8d5', fontSize: 11, fontWeight: '700' }}>SIM ▾</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <ModalLab />
      <View
        style={{
          position: 'fixed' as any,
          top: 6,
          left: '50%' as any,
          transform: [{ translateX: -170 }] as any,
          width: 340,
          zIndex: 99999,
          backgroundColor: '#17151cee',
          borderWidth: 1,
          borderColor: '#4a4258',
          borderRadius: 10,
          padding: 8,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: '#efe8d5', fontSize: 12, fontWeight: '800', marginRight: 4 }}>SIM</Text>
          <Pressable
            testID="sim-run-all"
            onPress={busy ? undefined : run}
            style={{
              backgroundColor: busy ? '#3a3644' : '#7c5a2e',
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 7,
              flex: 1,
            }}>
            <Text style={{ color: '#efe8d5', fontSize: 11, fontWeight: '700', textAlign: 'center' }}>
              {busy ? 'Running…' : '▶ Simulate Everything'}
            </Text>
          </Pressable>
          <Pressable
            testID="sim-modal-lab"
            onPress={() => simUi.set({ labOpen: !ui.labOpen })}
            style={{ backgroundColor: '#2c2836', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7 }}>
            <Text style={{ color: '#efe8d5', fontSize: 11 }}>Modals</Text>
          </Pressable>
          <Pressable
            testID="sim-export"
            onPress={exportNow}
            style={{ backgroundColor: '#2c2836', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7 }}>
            <Text style={{ color: '#efe8d5', fontSize: 11 }}>.md</Text>
          </Pressable>
          <Pressable
            testID="sim-collapse"
            onPress={() => setCollapsed(true)}
            style={{ paddingHorizontal: 6, paddingVertical: 7 }}>
            <Text style={{ color: '#9a93a5', fontSize: 11 }}>▴</Text>
          </Pressable>
        </View>
        {(ui.tourRunning || ui.tourProgress) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
            <Text numberOfLines={1} style={{ color: '#b8ae98', fontSize: 10, flex: 1 }}>
              {ui.tourProgress}
            </Text>
            {ui.tourRunning && (
              <Pressable
                testID="sim-cancel"
                onPress={() => cancelTour()}
                style={{ paddingHorizontal: 6 }}>
                <Text style={{ color: '#e0705a', fontSize: 10, fontWeight: '700' }}>cancel</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </>
  );
}
