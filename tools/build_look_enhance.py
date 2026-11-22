#!/usr/bin/env python3
"""스타핏픽 look-*.html 일괄 강화 빌드 (벤치마킹 2단계)

· data/looks.js에서 각 룩·모델 객체 리터럴을 균형 괄호로 추출해
  look-*.html 하단에 window.SFP_LOOK_DATA로 주입하고 look-enhance.js를 로드한다.
· 전 HTML의 style.css 캐시 버전을 일괄 bump한다. (기존 제휴 버튼·고지는 손대지 않음)
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOOKS_JS = (ROOT / "data" / "looks.js").read_text(encoding="utf-8")
ENHANCE_V = "2026112301"
CSS_V_NEW = "2026112301"

def slice_literal(text: str, ident: str, start_hint: int = 0) -> str | None:
    """`id: "<ident>"` 또는 `"id": "<ident>"`가 속한 객체 리터럴을 균형 괄호로 잘라낸다."""
    m = re.search(r'"?id"?:\s*"' + re.escape(ident) + r'"', text[start_hint:])
    if not m:
        return None
    brace_open = text.rfind("{", start_hint, start_hint + m.start())
    if brace_open < 0:
        return None
    depth = 0
    in_s = None
    esc_ = False
    for i in range(brace_open, len(text)):
        c = text[i]
        if in_s:
            if esc_:
                esc_ = False
            elif c == "\\":
                esc_ = True
            elif c == in_s:
                in_s = None
            continue
        if c in "'\"":
            in_s = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return text[brace_open:i + 1]
    return None

def main():
    models_start = LOOKS_JS.find("window.SFP_MODELS")
    looks_start = LOOKS_JS.find("window.SFP_LOOKS")
    assert models_start >= 0 and looks_start > models_start, "looks.js 구조 변경"

    look_files = sorted(ROOT.glob("look-*.html"))
    patched, missing = [], []
    for f in look_files:
        look_id = f.stem[len("look-"):]
        look_lit = slice_literal(LOOKS_JS, look_id, looks_start)
        if not look_lit:
            missing.append(look_id)
            continue
        model_lit = ""
        mm = re.search(r'"?modelId"?:\s*"([^"]+)"', look_lit)
        if mm:
            if mm:
                model_lit = slice_literal(LOOKS_JS, mm.group(1), models_start) or ""
        inject = (
            "<script>window.SFP_LOOK_DATA={look:" + look_lit
            + ",model:" + (model_lit or "null") + "};</script>\n"
            + f'<script src="assets/look-enhance.js?v={ENHANCE_V}"></script>'
        )
        s = f.read_text(encoding="utf-8")
        # 기존 주입 블록 제거(멱등)
        s = re.sub(r"<script>window\.SFP_LOOK_DATA=.*?</script>\n?", "", s, flags=re.S)
        s = re.sub(r'<script src="assets/look-enhance\.js[^"]*"></script>\n?', "", s)
        anchor = re.search(r'<script src="data/config\.js[^"]*"></script>', s)
        if not anchor:
            missing.append(look_id)
            continue
        s = s[: anchor.end()] + "\n" + inject + s[anchor.end():]
        # style.css 버전 bump
        s = re.sub(r'style\.css\?v=\d+[a-z]*', f"style.css?v={CSS_V_NEW}", s)
        f.write_text(s, encoding="utf-8")
        patched.append(look_id)

    # 룩 페이지 외 나머지 HTML도 style.css 버전 bump
    others = [p for p in ROOT.glob("*.html") if not p.name.startswith("look-")]
    bumped = []
    for f in others:
        s = f.read_text(encoding="utf-8")
        s2 = re.sub(r'style\.css\?v=\d+[a-z]*', f"style.css?v={CSS_V_NEW}", s)
        if s2 != s:
            f.write_text(s2, encoding="utf-8")
            bumped.append(f.name)

    print(f"look pages injected: {len(patched)}")
    print(f"css version bumped pages: {len(patched) + len(bumped)}")
    if missing:
        print("MISSING:", ", ".join(missing))
        sys.exit(1)

if __name__ == "__main__":
    main()
