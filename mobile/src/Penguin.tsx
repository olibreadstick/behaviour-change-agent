import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from './store';
import { color, styles as s } from './theme';
import { Button, Card, Field } from './ui';
import type { BuddyProfile } from './types';
// PNGs are served from mobile/public on Expo Web. Native Expo uses the packaged fallback.
const PENGUIN_WEB_IMAGES: Record<string, string> = {
  blue: '/behaviour-logo.png',
  green: '/penguin-green.png',
  pink: '/penguin-pink.png',
  purple: '/penguin-purple.png',
  red: '/penguin-red.png',
};
const nativePenguinImage = require('../assets/coach-penguin.png');
export const penguinImage = nativePenguinImage;


const COLOURS = [
  { id: 'blue', label: 'Blue', value: '#60A5FA' },
  { id: 'pink', label: 'Pink', value: '#F472B6' },
  { id: 'purple', label: 'Purple', value: '#A78BFA' },
  { id: 'green', label: 'Green', value: '#4ADE80' },
  { id: 'red', label: 'Red', value: '#EF4444' },
  { id: 'yellow', label: 'Yellow', value: '#FACC15' },
  { id: 'orange', label: 'Orange', value: '#FB923C' },
];
export function PenguinAvatar({ profile, size = 54 }: { profile: BuddyProfile; size?: number }) {
  const bodyColour = COLOURS.some(c => c.id === profile.penguinColour) ? profile.penguinColour : 'blue';
  const bowColour = COLOURS.some(c => c.id === profile.bowColour) ? profile.bowColour : 'red';
  // Match the 3D animated Pip used in chat, including the saved bow choice.
  // On native Expo, keep the bundled fallback until GIF assets are bundled natively.
  const image = Platform.OS === 'web'
    ? { uri: `/penguins/idle/penguin-${bodyColour}-bow-${bowColour}.gif` }
    : nativePenguinImage;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Image source={image} resizeMode="contain" style={{ width: size, height: size }} accessibilityLabel="Your customized penguin" />
  </View>;
}


export function PenguinHeader({ onCoach, onSettings, onClose }: { onCoach: () => void; onSettings?: () => void; onClose?: () => void }) {
  const { state } = useAppStore();
  return <View style={s.header}>
    <Pressable onPress={onCoach} accessibilityRole="button" accessibilityLabel={`Talk to ${state.profile.penguinName}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <PenguinAvatar profile={state.profile} size={48} />
      <View style={{ flex: 1 }}><Text style={s.heading}>{state.profile.penguinName}</Text><Text style={s.small}>Your behaviour change companion</Text></View>
    </Pressable>
    {onSettings && <Pressable onPress={onSettings} accessibilityRole="button" accessibilityLabel="Penguin and profile settings" style={{ padding: 12 }}><Ionicons name="settings-outline" size={24} color={color.ink} /></Pressable>}
    {onClose && <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ padding: 12 }}><Ionicons name="close" size={25} color={color.ink} /></Pressable>}
  </View>;
}

export function PenguinSettings({ onboarding = false, onClose, onLogout }: { onboarding?: boolean; onClose: () => void; onLogout?: () => void }) {
  const { state, update, track } = useAppStore();
  const [name, setName] = useState(state.profile.displayName); const [pronouns, setPronouns] = useState(state.profile.pronouns); const [penguinName, setPenguinName] = useState(state.profile.penguinName);
  const [penguinColour, setPenguinColour] = useState(state.profile.penguinColour || 'blue');
  const [bowColour, setBowColour] = useState(state.profile.bowColour || 'red');
  function save(skip = false) {
    update(st => ({ ...st, profile: { displayName: skip ? '' : name.trim(), pronouns: skip ? '' : pronouns.trim(), penguinName: skip ? 'Pip' : penguinName.trim() || 'Pip', onboarded: true, penguinColour: skip ? 'blue' : penguinColour, glassesColour: 'none', bowColour: skip ? 'blue' : bowColour } }));
    track('buddy_profile_updated'); onClose();
  }
  return <SafeAreaView style={s.modal}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.header}><PenguinAvatar profile={{ ...state.profile, penguinColour, bowColour }} size={55} /><Text style={[s.heading, { flex: 1 }]}>{onboarding ? 'Meet your buddy' : 'Your penguin & you'}</Text>{!onboarding && <Button secondary onPress={onClose}>Done</Button>}</View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={{ alignSelf: 'center' }}><PenguinAvatar profile={{ ...state.profile, penguinColour, bowColour }} size={130} /></View>
      <Text style={s.title}>{onboarding ? 'A little company for your journey.' : 'Make this space yours.'}</Text><Text style={s.body}>Your penguin learns alongside you, celebrates your effort, and helps you find your next small step.</Text>
      <Card><Field label="What would you like to be called? (optional)" value={name} onChangeText={setName} maxLength={60} />
        <Field label="Your pronouns (optional)" value={pronouns} onChangeText={setPronouns} maxLength={60} placeholder="For example, she/her, he/him, or they/them" />
        <Field label="What is your penguin’s name?" value={penguinName} onChangeText={setPenguinName} maxLength={30} placeholder="Pip" />
        <Text style={[s.heading, { marginTop: 14 }]}>Penguin colour</Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {COLOURS.map(c => <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ checked: penguinColour === c.id }} accessibilityLabel={`${c.label} penguin`} onPress={() => setPenguinColour(c.id)} style={{ alignItems: 'center', gap: 5 }}><View style={{ width: 40, height: 40, backgroundColor: c.value, borderRadius: 22, borderWidth: penguinColour === c.id ? 3 : 1, borderColor: penguinColour === c.id ? color.ink : color.line }} /><Text style={s.small}>{c.label}</Text></Pressable>)}
        </View>
        <Text style={s.heading}>Bow colour</Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {COLOURS.map(c => <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ checked: bowColour === c.id }} accessibilityLabel={`${c.label} bow`} onPress={() => setBowColour(c.id)} style={{ alignItems: 'center', gap: 5 }}><View style={{ width: 40, height: 40, backgroundColor: c.value, borderRadius: 8, borderWidth: bowColour === c.id ? 3 : 1, borderColor: bowColour === c.id ? color.ink : color.line }} /><Text style={s.small}>{c.label}</Text></Pressable>)}
        </View>
        <Text style={s.small}>You can change these anytime. They personalize your coaching.</Text><Button onPress={() => save()}>{onboarding ? 'Meet my penguin' : 'Save preferences'}</Button>
        {onboarding && <Button secondary onPress={() => save(true)}>Start with Pip for now</Button>}
      </Card>
      {onLogout && <Button secondary onPress={onLogout}>Sign out</Button>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
