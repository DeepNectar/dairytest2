#!/usr/bin/env python3
"""De-obfuscate script.js: strip injected spaces inside string literals,
template literals and regex literals; fix HTML-entity mangling in escaper."""
import re

SRC = '/workspace/script.js'
data = open(SRC, encoding='utf-8').read()

# ---------- 1. escapeHtml entity lines (mangled) ----------
entity_line_fixes = [
    ('.replace(/&/g,  "&")',      '.replace(/&/g, "&amp;")'),
    ('.replace(/</g,  "<")',      '.replace(/</g, "&lt;")'),
    ('.replace(/>/g,  ">")',      '.replace(/>/g, "&gt;")'),
    ('.replace(/"/g,  """)',      '.replace(/"/g, "&quot;")'),
    (".replace(/'/g,  \"'\")",    ".replace(/'/g, '&#039;')"),
]
for broken, fixed in entity_line_fixes:
    if broken in data:
        data = data.replace(broken, fixed)
    else:
        print('WARN entity line not found verbatim:', broken)

# ---------- 2. tokenizer ----------
def is_regex_allowed(prev):
    return prev in '(,=:[!&|?{};+-*%~^<>' or prev == ''

out = []
i = 0
n = len(data)
prev_sig = ''
changes = 0
while i < n:
    c = data[i]
    if c == '/' and i + 1 < n and data[i+1] == '/':
        j = data.find('\n', i)
        j = n if j == -1 else j
        out.append(data[i:j]); i = j; continue
    if c == '/' and i + 1 < n and data[i+1] == '*':
        j = data.find('*/', i + 2)
        j = n if j == -1 else j + 2
        out.append(data[i:j]); i = j; continue
    if c == '"':
        j = i + 1; buf = []
        while j < n:
            ch = data[j]
            if ch == '\\':
                buf.append(data[j:j+2]); j += 2; continue
            if ch == '"':
                break
            if ch == '\n':
                break
            buf.append(ch); j += 1
        if j >= n or data[j] != '"':
            out.append(c); prev_sig = c; i += 1; continue
        content = ''.join(buf)
        new_content = content.replace(' ', '')
        if new_content != content: changes += 1
        out.append('"' + new_content + '"')
        prev_sig = '"'; i = j + 1; continue
    if c == "'":
        j = i + 1; buf = []
        while j < n:
            ch = data[j]
            if ch == '\\':
                buf.append(data[j:j+2]); j += 2; continue
            if ch == "'":
                break
            if ch == '\n':
                break
            buf.append(ch); j += 1
        if j >= n or data[j] != "'":
            out.append(c); prev_sig = c; i += 1; continue
        content = ''.join(buf)
        new_content = content.replace(' ', '')
        if new_content != content: changes += 1
        out.append("'" + new_content + "'")
        prev_sig = "'"; i = j + 1; continue
    if c == '`':
        j = i + 1; seg = []; res = ['`']
        while j < n:
            ch = data[j]
            if ch == '\\':
                seg.append(data[j:j+2]); j += 2; continue
            if ch == '`':
                break
            if ch == '$' and j + 1 < n and data[j+1] == '{':
                s = ''.join(seg).replace(' ', '')
                if s != ''.join(seg): changes += 1
                res.append(s); seg = []
                depth = 1; k = j + 1; expr = []
                while k < n:
                    k += 1
                    e = data[k]
                    if e == '{': depth += 1
                    elif e == '}':
                        depth -= 1
                        if depth == 0: break
                    expr.append(e)
                res.append('${' + ''.join(expr) + '}')
                j = k + 1
                continue
            seg.append(ch); j += 1
        s = ''.join(seg).replace(' ', '')
        if s != ''.join(seg): changes += 1
        res.append(s); res.append('`')
        out.append(''.join(res))
        prev_sig = '`'; i = j + 1 if j < n else n; continue
    if c == '/' and is_regex_allowed(prev_sig):
        j = i + 1; buf = []; in_class = False; ok = False; term = None
        while j < n:
            ch = data[j]
            if ch == '\\':
                buf.append(data[j:j+2]); j += 2; continue
            if ch == '\n': break
            if ch == '[': in_class = True
            elif ch == ']': in_class = False
            elif ch == '/' and not in_class:
                ok = True; term = j; break
            buf.append(ch); j += 1
        if ok:
            body = ''.join(buf)
            k = term + 1; flags = ''
            while k < n and data[k].isalpha():
                flags += data[k]; k += 1
            new_body = body.replace(' ', '')
            if new_body != body: changes += 1
            out.append('/' + new_body + '/' + flags)
            prev_sig = '/'; i = k; continue
        out.append(c); prev_sig = c; i += 1; continue
    out.append(c)
    if not c.isspace(): prev_sig = c
    i += 1

data = ''.join(out)
open(SRC, 'w', encoding='utf-8').write(data)
print('pass complete, tokens cleaned:', changes)
