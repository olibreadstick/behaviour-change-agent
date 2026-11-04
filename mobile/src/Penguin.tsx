import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from './store';
import { energyEarned } from './domain';
import { color, styles as s } from './theme';
import { Button, Card, Field } from './ui';
export const penguinImage = require('../assets/coach-penguin.png');

export function PenguinHeader({ onCoach, onSettings, onClose }: { onCoach: () => void; onSettings?: () => void; onClose?: () => void }) {
  const { state } = useAppStore();
  return <View style={s.header}>
    <Pressable onPress={onCoach} accessibilityRole="button" accessibilityLabel={`Talk to ${state.profile.penguinName}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Image source={penguinImage} resizeMode="contain" style={{ width: 48, height: 48 }} />
      <View style={{ flex: 1 }}><Text style={s.heading}>{state.profile.penguinName}</Text><Text style={s.small}>Your AI buddy · {energyEarned(state)} energy</Text></View>
    </Pressable>
    {onSettings && <Pressable onPress={onSettings} accessibilityRole="button" accessibilityLabel="Penguin and profile settings" style={{ padding: 12 }}><Ionicons name="settings-outline" size={24} color={color.ink} /></Pressable>}
    {onClose && <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ padding: 12 }}><Ionicons name="close" size={25} color={color.ink} /></Pressable>}
  </View>;
}

export function PenguinSettings({ onboarding = false, onClose, onLogout }: { onboarding?: boolean; onClose: () => void; onLogout?: () => void }) {
  const { state, update, track } = useAppStore();
  const [name, setName] = useState(state.profile.displayName); const [pronouns, setPronouns] = useState(state.profile.pronouns); const [penguinName, setPenguinName] = useState(state.profile.penguinName);
  function save(skip = false) {
    update(st => ({ ...st, profile: { displayName: skip ? '' : name.trim(), pronouns: skip ? '' : pronouns.trim(), penguinName: skip ? 'Pip' : penguinName.trim() || 'Pip', onboarded: true } }));
    track('buddy_profile_updated'); onClose();
  }
  return <SafeAreaView style={s.modal}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.header}><Image source={penguinImage} resizeMode="contain" style={{ width: 55, height: 55 }} /><Text style={[s.heading, { flex: 1 }]}>{onboarding ? 'Meet your buddy' : 'Your penguin & you'}</Text>{!onboarding && <Button secondary onPress={onClose}>Done</Button>}</View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Image source={penguinImage} resizeMode="contain" style={{ width: 130, height: 130, alignSelf: 'center' }} />
      <Text style={s.title}>{onboarding ? 'A little company for your journey.' : 'Make this space yours.'}</Text><Text style={s.body}>Your penguin learns alongside you, celebrates your effort, and helps you find your next small step.</Text>
      <Card><Field label="What would you like to be called? (optional)" value={name} onChangeText={setName} maxLength={60} />
        <Field label="Your pronouns (optional)" value={pronouns} onChangeText={setPronouns} maxLength={60} placeholder="For example, she/her, he/him, or they/them" />
        <Field label="What is your penguin’s name?" value={penguinName} onChangeText={setPenguinName} maxLength={30} placeholder="Pip" />
        <Text style={s.small}>You can change these anytime. They personalize your coaching.</Text><Button onPress={() => save()}>{onboarding ? 'Meet my penguin' : 'Save preferences'}</Button>
        {onboarding && <Button secondary onPress={() => save(true)}>Start with Pip for now</Button>}
      </Card>
      <Card><Text style={s.heading}>Effort gives your penguin energy</Text><Text style={s.body}>Short lessons and submitted guide exercises: +20 energy.{ '\n' }Completed activities: +15 energy.{ '\n' }Submitted reflections: +5 energy.</Text><Text style={s.small}>Energy celebrates participation. It stays with you when you take a break.</Text></Card>
      {onLogout && <Button secondary onPress={onLogout}>Sign out</Button>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
