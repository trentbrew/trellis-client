#!/usr/bin/env python3
import re

file_path = '../theme-presets.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Count presets before
preset_count_before = len(re.findall(r"  '[^']+': \{", content))
source_count_before = len(re.findall(r"source: 'BUILT_IN'", content))

# Add source property to presets that don't have it
# Pattern: 'preset-name': { followed by label: (not preceded by source)
pattern = r"(  '[^']+': \{\n)(    label:)"
replacement = r"\1    source: 'BUILT_IN',\n\2"
content = re.sub(pattern, replacement, content)

# Count after
source_count_after = len(re.findall(r"source: 'BUILT_IN'", content))

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Processed {preset_count_before} presets")
print(f"✅ Added source property: {source_count_before} → {source_count_after}")
