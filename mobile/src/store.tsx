import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { AppState, Tab, UsageEvent } from './types';
import { decodeState, emptyState, mergeRestoredState, migrateLegacy } from './domain';
import { loadLegacyProfile, loadRemote, postEvent, saveRemote } from './api';
import { browserLegacyRecords, legacyProfile } from './website';

export const uuid = () => Crypto.randomUUID();
// Do not leave participants on the loading screen while a sleeping backend wakes up.
// A timeout only stops waiting during startup; it does not delete device or cloud data.
function startupTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Startup cloud request timed out')), milliseconds);
    promise.then(
      value => { clearTimeout(timeout); resolve(value); },
      error => { clearTimeout(timeout); reject(error); },
    );
  });
}

type Update = (state: AppState) => AppState;
interface Store { state: AppState; ready: boolean; status: string; error: string; update: (fn: Update) => void;
  track: (type: string, metadata?: UsageEvent['metadata']) => void; sync: () => Promise<void>; }
const Context = createContext<Store | null>(null);
export const useAppStore = () => { const store = useContext(Context); if (!store) throw new Error('App store unavailable'); return store; };
export function AppStore({ participantId, preview, children }: { participantId: string; preview: boolean; children: React.ReactNode }) {
  const [state, setState] = useState(() => emptyState(uuid()));
  const ref = useRef(state);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(preview ? 'Preview on this device' : 'Loading your progress');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const cloudLoaded = useRef(false);
  const alive = useRef(true);
  const writes = useRef(Promise.resolve());
  const key = `behaviour_change_mobile_${participantId}`;
  const publish = (next: AppState) => { ref.current = next; setState(next); };
  const update = (fn: Update) => {
    const next = fn(ref.current);
    publish({ ...next, revision: ref.current.revision + 1, dirty: true, updatedAt: new Date().toISOString() });
  };
  const track = (type: string, metadata: UsageEvent['metadata'] = {}) => update(s => ({ ...s, pendingEvents: [...s.pendingEvents,
    { id: uuid(), userId: participantId, type, timestamp: new Date().toISOString(), metadata: { ...metadata, platform: Platform.OS === 'web' ? 'web' : 'mobile' } }] }));
  const restoreLegacy = async (current: AppState, records: Awaited<ReturnType<typeof loadRemote>>) => {
    // Neon wins where the old site has both cloud and browser copies.
    const all = [...records, ...browserLegacyRecords(participantId).filter(r => !records.some(remote => remote.key === r.key))];
    let restored = migrateLegacy(current, all, participantId);
    if (!restored.profile.onboarded && !restored.profile.displayName) {
      try { restored = legacyProfile(restored, await startupTimeout(loadLegacyProfile(participantId), 5000)); } catch { /* Keep optional onboarding available. */ }
    }
    return { ...restored, dirty: true };
  };
  const sync = async () => {
    if (preview || !ready || busy.current) return;
    if (cloudLoaded.current && !ref.current.dirty && !ref.current.pendingEvents.length) return;
    busy.current = true;
    setStatus('Saving progress');
    try {
      if (!cloudLoaded.current) {
        const records = await startupTimeout(loadRemote(participantId), 12000);
        const record = records.find(r => r.key === key);
        const remote = record ? decodeState(JSON.parse(record.payload)) : null;
        publish(await restoreLegacy(remote ? mergeRestoredState(ref.current, remote) : ref.current, records));
        cloudLoaded.current = true;
      }
      const snapshot = ref.current;
      if (snapshot.dirty) await saveRemote(participantId, snapshot);
      const sent: string[] = [];
      for (const event of snapshot.pendingEvents) { await postEvent(event); sent.push(event.id); }
      if (alive.current) {
        const current = ref.current;
        publish({ ...current, dirty: current.revision !== snapshot.revision, pendingEvents: current.pendingEvents.filter(e => !sent.includes(e.id)) });
        setError(''); setStatus(ref.current.dirty ? 'Changes waiting to save' : 'Progress saved');
      }
    } catch (e) { if (alive.current) { setError(e instanceof Error ? e.message : 'Unable to save progress.'); setStatus('Saved on device · retry sync'); } }
    finally { busy.current = false; }
  };
  useEffect(() => {
    alive.current = true;
    (async () => {
      let selected = ref.current;
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) selected = decodeState(JSON.parse(cached)) || selected;
      } catch { setError('Unable to restore the saved device copy.'); }
      if (!preview) {
        try {
          const records = await startupTimeout(loadRemote(participantId), 12000);
          const remoteRecord = records.find(r => r.key === key);
          const remote = remoteRecord ? decodeState(JSON.parse(remoteRecord.payload)) : null;
          if (remote && !selected.dirty) selected = { ...remote, pendingEvents: selected.pendingEvents };
          else if (remote && selected.dirty) selected = mergeRestoredState(selected, remote);
          selected = await restoreLegacy(selected, records);
          cloudLoaded.current = true;
          setStatus('Progress loaded');
        } catch { setError('Cloud progress could not be loaded. Your device copy is available; retry sync when connected.'); setStatus('Using device copy'); }
      }
      if (alive.current) { publish(selected); setReady(true); }
    })();
    return () => { alive.current = false; };
  }, [participantId]);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(key, JSON.stringify(state)));
    writes.current.catch(() => { if (alive.current) { setError('Unable to save on this device. Keep the app open and retry sync.'); setStatus('Device save failed'); } });
    const timer = setTimeout(() => { void sync(); }, 800);
    return () => clearTimeout(timer);
  }, [state, ready]);
  useEffect(() => { if (!ready) return; track('app_opened'); const timer = setInterval(() => { void sync(); }, 30000); return () => clearInterval(timer); }, [ready]);
  return <Context.Provider value={{ state, ready, status, error, update, track, sync }}>{children}</Context.Provider>;
}
