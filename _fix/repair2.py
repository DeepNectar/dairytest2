#!/usr/bin/env python3
"""Second-pass repair of script.js: fix quote-mangling (empty strings turned
into double spaces, replacement-arg quotes turned into U+201D) and stray
spaces inside identifiers."""
import io

SRC = '/workspace/script.js'
data = open(SRC, encoding='utf-8').read()
report = []

def rep(old, new, label):
    global data
    if old in data:
        c = data.count(old)
        data = data.replace(old, new)
        report.append(f'{label}: {c}x')
    else:
        report.append(f'MISS {label}')

# ---------- 1. empty-string args mangled to '  ' or ' ”' (any context) ----------
rep(',  ”")', ', "")', 'mangled-empty-double')   # must run before the plain one
rep(',  ")', ', ")', 'empty-str-call')
rep(',  ”)', ', "")', 'mangled-empty-single')
rep('$1”', '$1"', 'mangled-repl-dollar1')

# ---------- 2. HTML class attrs with smart quotes -> plain quotes ----------
rep('class=“eb-extra ”>', 'class="eb-extra">', 'eb-extra')
rep('class=“eb-label ”>', 'class="eb-label">', 'eb-label')

# ---------- 3. escapeHtml stray paren ----------
rep(".replace(/'/g, '&#039;'));\n}", ".replace(/'/g, '&#039;');\n}", 'escapeHtml-paren')

# ---------- 4. canonicalRe regex fixes ----------
rep('[\\s\\S][\"\\u201d]?\\s$(?:', '[\\s\\S][\"\\u201d]?\\s*$(?:', 'canonicalRe-s$')
rep('(?:\\r?\\n(?:WhatIfelt|Note):[\\s\\S])?', '(?:\\r?\\n(?:What I felt|Note):[\\s\\S])*', 'canonicalRe-marker')

# ---------- 5. stray space inside identifiers ----------
rep('Math.m ax(', 'Math.max(', 'Math.max')
rep('for (le t i', 'for (let i', 'for-let')

open(SRC, 'w', encoding='utf-8').write(data)
print('\n'.join(report))
