#!/usr/bin/env python3
"""Patch only Learn page 'Read guide' resource buttons. Run from repository root."""
from pathlib import Path
import re
import shutil

path = Path('mobile/src/screens.tsx')
if not path.exists():
    raise SystemExit(f'File not found: {path}. Run from the Behaviour-Change-Agent project root.')
source = path.read_text()
if 'export function Learn(' not in source:
    raise SystemExit('Cannot locate the Learn page. No changes made.')
if 'function ReadGuideLink(' in source:
    print('The book-style Read guide button already exists in screens.tsx. No changes needed.')
    raise SystemExit(0)

# Match by resource action, not outdated UI labels. Preserve resource IDs/handlers.
pattern = re.compile(r'<Button\b[^>]*\bonPress=\{\(\)\s*=>\s*void\s+openResource\(\s*(?P<id>g\.id|[\'\"]self_talk[\'\"])\s*\)\s*\}[^>]*>\s*[^<]*\s*</Button>')
new_source, replacements = pattern.subn(lambda m: '<ReadGuideLink label="Read guide" onPress={() => void openResource(' + m.group('id') + ')} />', source)
if replacements == 0:
    raise SystemExit('Could not safely locate any PDF resource buttons. No changes made. Please upload mobile/src/screens.tsx.')

# Inject the existing Expo Ionicons dependency and required RN components if absent.
if not re.search(r"import\s+Ionicons\s+from\s+['\"]@expo/vector-icons/Ionicons['\"]", new_source):
    new_source = "import Ionicons from '@expo/vector-icons/Ionicons';\n" + new_source
rn_import = re.search(r"import\s*\{(?P<items>[^}]+)\}\s*from\s*['\"]react-native['\"]\s*;", new_source, re.S)
if not rn_import:
    raise SystemExit('Cannot locate react-native imports. No changes made.')
existing = set(re.findall(r'\b[A-Za-z]+\b', rn_import.group('items')))
missing = [name for name in ['Pressable', 'Platform', 'Text'] if name not in existing]
if missing:
    new_source = new_source[:rn_import.start('items')] + rn_import.group('items').rstrip() + ', ' + ', '.join(missing) + new_source[rn_import.end('items'):]

component = '''// Book-styled link to the original learning resource; preserves the existing PDF action.
function ReadGuideLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, backgroundColor: '#F0F8FC', borderColor: '#C8E5F0',
        borderWidth: 1, borderRadius: 16, paddingVertical: 15,
        paddingHorizontal: 14, minHeight: 52 }}
    >
      <Ionicons name="book-outline" size={23} color="#147EA0" />
      <Text style={{ color: '#173448', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 17, fontWeight: '600', letterSpacing: 0.2 }}>{label}</Text>
      <Ionicons name="arrow-forward-outline" size={18} color="#147EA0" />
    </Pressable>
  );
}

'''
new_source = new_source.replace('export function Learn(', component + 'export function Learn(', 1)
backup = path.with_suffix('.tsx.read-guide-backup')
shutil.copy2(path, backup)
path.write_text(new_source)
print(f'Updated {replacements} Read guide resource button(s) in {path}.')
print(f'Backup: {backup}')
print('Refresh Expo and open the Learn tab to see the book icon and updated font.')
