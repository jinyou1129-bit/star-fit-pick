#!/usr/bin/env python3
"""window.SFP_LOOK_DATA (JS 객체 리터럴) -> dict 추출 유틸.

구형 페이지는 {look:{ "id": ... }} 처럼 키를 따옴표 없이 쓴 JS 객체 리터럴이라
json.loads 로 바로 읽히지 않는다. 문자열 내부를 건드리지 않고 바깥쪽 맨 키만
따옴표로 감싸 JSON 으로 변환한다.
"""
import json
import re

_IDENT_START = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$")
_IDENT_CHARS = _IDENT_START | set("0123456789")


def js_to_json(src):
    out = []
    i = 0
    n = len(src)
    in_str = None
    while i < n:
        ch = src[i]
        if in_str:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if ch == in_str:
                in_str = None
            i += 1
            continue
        if ch in ('"', "'"):
            in_str = ch
            out.append('"' if ch == "'" else ch)
            i += 1
            continue
        if ch in _IDENT_START:
            j = i
            while j < n and src[j] in _IDENT_CHARS:
                j += 1
            word = src[i:j]
            k = j
            while k < n and src[k] in " \t\r\n":
                k += 1
            if k < n and src[k] == ":":
                out.append('"' + word + '"')
            else:
                out.append(word)
            i = j
            continue
        out.append(ch)
        i += 1
    text = "".join(out)
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    return text


def extract_look_data(html):
    m = re.search(r"window\.SFP_LOOK_DATA\s*=\s*", html)
    if not m:
        return None
    start = m.end()
    depth = 0
    i = start
    in_str = None
    n = len(html)
    while i < n:
        ch = html[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == in_str:
                in_str = None
            i += 1
            continue
        if ch in ('"', "'"):
            in_str = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                raw = html[start:i + 1]
                return json.loads(js_to_json(raw))
        i += 1
    raise ValueError("SFP_LOOK_DATA end not found")
