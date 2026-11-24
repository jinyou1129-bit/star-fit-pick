#!/usr/bin/env python3
"""schema.org Validator API 로 라이브 URL 의 JSON-LD 를 검증한다.

  python3 tools/validate_schema.py https://starfitpick.netlify.app/look-xxx.html [...]
"""
import json
import subprocess
import sys


def check(url):
    out = subprocess.run(
        ["curl", "-sS", "-m", "90", "-X", "POST", "https://validator.schema.org/validate",
         "-H", "Content-Type: application/x-www-form-urlencoded", "--data-urlencode", f"url={url}"],
        capture_output=True, text=True).stdout
    d = json.loads(out[out.find("{"):])
    msgs = []

    def walk(n):
        if isinstance(n, dict):
            for k, v in n.items():
                if k in ("errors", "warnings") and isinstance(v, list):
                    for x in v:
                        if isinstance(x, dict):
                            msgs.append((k, x.get("errorCode") or x.get("message") or str(x)[:120]))
                        else:
                            msgs.append((k, str(x)[:120]))
                else:
                    walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)

    walk(d)
    return d, msgs


def main():
    rc = 0
    for url in sys.argv[1:]:
        d, msgs = check(url)
        print(f"{url}\n  objects={d.get('numObjects')} errors={d.get('totalNumErrors')} warnings={d.get('totalNumWarnings')}")
        for m in msgs[:8]:
            print("   ", m)
        if d.get("totalNumErrors"):
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
