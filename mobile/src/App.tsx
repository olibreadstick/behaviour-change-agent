import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';

import { authenticate } from './api';
import { AppStore, useAppStore, uuid } from './store';
import { coachContext } from './domain';
import { guideResponse } from './guide-engine.cjs';
import { AskCoach, GuideId, Tab } from './types';
import { color, styles as s } from './theme';
import { Button, Card, ErrorText, Field } from './ui';
import { Learn, Community } from './screens';
import { MuseHome, MuseGoals } from './MuseScreens';
import { Guide } from './Guide';
import { Coach } from './Coach';
import { PenguinHeader, PenguinSettings } from './Penguin';
import {
  readWebsiteSession,
  saveWebsiteSession,
} from './website';

const tabs: Tab[] = ['Today', 'Learn', 'Goals', 'Compassion Hub'];

const icons = [
  'sunny-outline',
  'trail-sign-outline',
  'flag-outline',
  'chatbubble-ellipses-outline',
] as const;

export const coachImage = require('../assets/coach-penguin.png');

export const explainError = (e: unknown) =>
  e instanceof Error
    ? e.message
    : 'Unable to complete this step. Please try again.';

export default function App() {
  const [session, setSession] = useState(() => {
    const savedSession = readWebsiteSession();

    if (
      savedSession?.participantId === 'mobile-preview' ||
      savedSession?.preview
    ) {
      return null;
    }

    return savedSession;
  });

  useEffect(() => {
    saveWebsiteSession(session);
  }, [session]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />

      <View
        style={[
          { flex: 1 },
          Platform.OS === 'web' && {
            width: '100%',
            maxWidth: 920,
            alignSelf: 'center',
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: color.line,
          },
        ]}
      >
        {session ? (
          <AppStore
            key={session.participantId}
            {...session}
          >
            <Shell
              {...session}
              onLogout={() => setSession(null)}
            />
          </AppStore>
        ) : (
          <Welcome onSession={setSession} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

function Welcome({
  onSession,
}: {
  onSession: (session: {
    participantId: string;
    preview: boolean;
  }) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function login() {
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const result = await authenticate(
        username.trim(),
        password,
        signup,
      );

      if (!result.participantId) {
        throw new Error(
          'The service did not return a participant account.',
        );
      }

      setPassword('');

      onSession({
        participantId: result.participantId,
        preview: false,
      });
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.content,
            { paddingTop: 35 },
          ]}
        >
          <Image
            source={Platform.OS === 'web' ? { uri: '/penguins/idle/penguin-blue-bow-red.gif' } : coachImage}
            style={{ width: 100, height: 100 }}
            accessibilityLabel="Your penguin coach"
            resizeMode="contain"
          />

          <Text style={s.eyebrow}>
            Daily Coach
          </Text>

          <Text style={s.title}>
            Small steps.{ '\n' }Your own pace.
          </Text>

          <Text style={s.body}>
            Learn a strategy, make it yours, and find
            support along the way.
          </Text>

          <Card>
            <Text style={s.heading}>
              {signup
                ? 'Create your account'
                : 'Welcome back'}
            </Text>

            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={
                signup
                  ? 'newPassword'
                  : 'password'
              }
            />

            <Text style={s.small}>
              Keep your username and password
              confidential. Researchers use your
              participant ID.
            </Text>

            <ErrorText>{error}</ErrorText>

            <Button
              busy={busy}
              onPress={() => void login()}
            >
              {signup
                ? 'Create account'
                : 'Sign in'}
            </Button>

            <Button
              secondary
              disabled={busy}
              onPress={() => {
                setSignup(!signup);
                setError('');
              }}
            >
              {signup
                ? 'I already have an account'
                : 'Create an account'}
            </Button>
          </Card>


          {Platform.OS === 'web' && (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                window.location.assign('/admin/');
              }}
              style={{
                padding: 14,
                alignSelf: 'center',
              }}
            >
              <Text
                style={[
                  s.small,
                  { color: color.blue },
                ]}
              >
                Researcher sign in
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Shell({
  participantId,
  preview,
  onLogout,
}: {
  participantId: string;
  preview: boolean;
  onLogout: () => void;
}) {
  const store = useAppStore();
  const { state, ready, update, track } = store;

  const [tab, setTab] = useState<Tab>('Today');
  const [guideOpen, setGuideOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const go = (next: Tab) => {
    setTab(next === 'Feed' ? 'Today' : next);
    track('page_viewed', { page: next });
  };

  const startGuide = (
    id: GuideId,
    mode: 'learn' | 'use',
  ) => {
    const result = guideResponse(
      {
        guide_id: id,
        mode,
        kind: 'open',
        step: 0,
      },
      coachContext(
        state,
        participantId,
        tab,
      ),
    );

    if (result.guide_redirect) {
      startGuide(
        result.guide_redirect,
        'use',
      );
      return;
    }

    update((st) => ({
      ...st,
      guide:
        result.guide && {
          ...result.guide,
          attemptId: uuid(),
        },
    }));

    track('workshop_started', {
      guide: id,
      workshopId: id,
      mode,
    });

    setGuideOpen(true);
  };

  const askCoach: AskCoach = (request) => {
    update((st) => ({
      ...st,
      coachRequest: {
        id: uuid(),
        source: tab,
        kind: 'check_in',
        prompt: `I’d like support with ${
          tab === 'Compassion Hub'
            ? 'how things are going'
            : tab.toLowerCase()
        }.`,
        ...request,
      },
    }));

    setGuideOpen(false);
    go('Compassion Hub');
  };

  if (!ready) {
    return (
      <SafeAreaView
        style={[
          s.root,
          {
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          },
        ]}
      >
        <ActivityIndicator
          color={color.blue}
        />

        <Text style={s.body}>
          Loading your progress…
        </Text>
      </SafeAreaView>
    );
  }

  if (!state.profile.onboarded) {
    return (
      <PenguinSettings
        onboarding
        onClose={() => {}}
      />
    );
  }

  return (
    <SafeAreaView
      style={s.root}
      edges={['top', 'bottom']}
    >
      <PenguinHeader
        onCoach={() => askCoach()}
        onSettings={() =>
          setSettingsOpen(true)
        }
      />


      {!!store.error && (
        <View style={{ padding: 12 }}>
          <ErrorText>
            {store.error}
          </ErrorText>
        </View>
      )}

      {tab === 'Community' && <Pressable accessibilityRole="button" onPress={() => go('Today')} style={{ paddingHorizontal: 22, paddingVertical: 8 }}><Text style={[s.small, { color: color.blue }]}>‹ Back to home</Text></Pressable>}

      {tab === 'Compassion Hub' ? (
        <Coach
          participantId={participantId}
          preview={preview}
          onGuide={startGuide}
        />
      ) : tab === 'Community' ? (
        <Community
          participantId={participantId}
          preview={preview}
          onCoach={askCoach}
        />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          {tab === 'Today' && <MuseHome onGuide={startGuide} onCoach={askCoach} onGoals={() => go('Goals')} onLearn={() => go('Learn')} onCommunity={() => go('Community')} />}

          {tab === 'Learn' && (
            <Learn
              onGuide={startGuide}
              onResume={() => setGuideOpen(true)}
              onCoach={askCoach}
            />
          )}

          {tab === 'Goals' && <MuseGoals onGuide={startGuide} onCoach={askCoach} />}
        </ScrollView>
      )}

      <View style={s.nav}>
        {tabs.map((item, index) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{
              selected: tab === item,
            }}
            onPress={() => go(item)}
            style={s.navItem}
          >
            <Ionicons
              name={icons[index]}
              size={23}
              color={
                tab === item
                  ? color.blue
                  : color.muted
              }
            />

            <Text
              style={[
                s.navText,
                tab === item && {
                  color: color.blue,
                },
                { textAlign: 'center' },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={guideOpen}
        animationType="slide"
        onRequestClose={() =>
          setGuideOpen(false)
        }
      >
        <Guide
          participantId={participantId}
          preview={preview}
          onClose={() =>
            setGuideOpen(false)
          }
          onGuide={startGuide}
          onCoach={askCoach}
        />
      </Modal>

      <Modal
        visible={settingsOpen}
        animationType="slide"
        onRequestClose={() =>
          setSettingsOpen(false)
        }
      >
        <PenguinSettings
          onClose={() =>
            setSettingsOpen(false)
          }
          onLogout={onLogout}
        />
      </Modal>
    </SafeAreaView>
  );
}
