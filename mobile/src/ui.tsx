import React from 'react';
import { Pressable, Text, TextInput, View, ActivityIndicator, TextInputProps } from 'react-native';
import { color, styles as s } from './theme';
export function Button({ children, onPress, secondary = false, disabled = false, busy = false }: { children: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={() => onPress()}
    style={({ pressed }) => [s.button, secondary && s.secondary, { opacity: disabled || busy ? 0.55 : pressed ? 0.8 : 1 }]}>
    {busy ? <ActivityIndicator color={secondary ? color.blue : color.white} /> : <Text style={[s.buttonText, secondary && s.secondaryText]}>{children}</Text>}
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={color.muted} {...props} style={[s.input, props.multiline && { minHeight: 100, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Card({ children }: { children: React.ReactNode }) { return <View style={s.card}>{children}</View>; }
export function ErrorText({ children }: { children: string }) { return children ? <Text accessibilityRole="alert" style={s.error}>{children}</Text> : null; }
