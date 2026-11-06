#!/usr/bin/env python3
"""Patch only two UI details in CURRENT local App.tsx/Penguin.tsx; preserve everything else."""
from pathlib import Path
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parent
# Place script in repository root or pass repository root as the first argument.
if len(sys.argv) > 1:
    ROOT = Path(sys.argv[1]).expanduser().resolve()
app = ROOT / 'mobile/src/App.tsx'
penguin = ROOT / 'mobile/src/Penguin.tsx'
if not app.exists() or not penguin.exists():
    sys.exit('Cannot find mobile/src/App.tsx and mobile/src/Penguin.tsx. Run from your project root.')

old = app.read_text()
# Change ONLY the login-screen static penguin. Keep native-image fallback.
pattern = re.compile(r'(<Image\s+source=)\{coachImage\}(\s+style=\{\{\s*width:\s*100,\s*height:\s*100\s*\}\})', re.MULTILINE)
new, count = pattern.subn(r"\1{Platform.OS === 'web' ? { uri: '/penguins/idle/penguin-blue-bow-red.gif' } : coachImage}\2", old, count=1)
if count != 1:
    print('LOGIN: No change. Login image code differs from the earlier version; inspect App.tsx manually.')
else:
    shutil.copy2(app, app.with_suffix('.tsx.before-gemini-ui'))
    app.write_text(new)
    print('LOGIN: Changed 100x100 coachImage on login screen to blue/red idle animation on web.')

old = penguin.read_text()
# Remove only the onboarding skip button; retain Meet my penguin and all customization fields.
pattern = re.compile(r'\{onboarding\s*&&\s*<Button\s+secondary\s+onPress=\{\(\)\s*=>\s*save\(true\)\}\s*>\s*Start with Pip for now\s*</Button>\s*\}')
new, count = pattern.subn('', old, count=1)
if count != 1:
    print('ONBOARDING: No change. Could not find exact skip button; inspect Penguin.tsx manually.')
else:
    shutil.copy2(penguin, penguin.with_suffix('.tsx.before-gemini-ui'))
    penguin.write_text(new)
    print('ONBOARDING: Removed only Start with Pip for now; Meet my penguin remains.')
