#!/usr/bin/env python3
import re
import sys
from pathlib import Path

root = Path(__file__).parent.parent
presets_md = root / 'docs' / 'PRESETS.md'
presets_ts = root / 'app' / 'config' / 'presets.ts'

with open(presets_md, 'r') as f:
    content = f.read()

# Fix imports
content = content.replace(
    "import { ThemePreset } from '../types/theme'",
    "import type { ThemePreset, ThemePresets } from '~/types/theme'"
)

# Fix type
content = content.replace('Record<string, ThemePreset>', 'ThemePresets')

# Add source property to presets missing it
# Match pattern: 'preset-name': { ... label:
def add_source_if_missing(match):
    full_match = match.group(0)
    # Check if source already exists in this preset block
    if 'source:' in full_match:
        return full_match
    # Add source before label
    return re.sub(r'(label:)', r"    source: 'BUILT_IN',\n    \1", full_match, count=1)

# Match preset blocks that start with 'name': { and have label: soon after
content = re.sub(
    r"('[\w-]+':\s*\{[^}]*?)(label:)",
    add_source_if_missing,
    content,
    flags=re.DOTALL
)

with open(presets_ts, 'w') as f:
    f.write(content)

# Count presets
preset_count = len(re.findall(r"'[\w-]+':\s*\{", content))
print(f"✅ Successfully extracted {preset_count} presets")
print(f"   File: {presets_ts}")
