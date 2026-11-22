import json,re
def load(path):
    s=open(path,encoding='utf-8').read()
    j=s.index('[',s.index('window.SFP_LOOKS'))
    body=s[j:]
    out=[];i=0;n=len(body);instr=False;esc=False;expect_key=False
    while i<n:
        c=body[i]
        if instr:
            out.append(c)
            if esc: esc=False
            elif c=='\\': esc=True
            elif c=='"': instr=False
            i+=1; continue
        if c=='"':
            instr=True; out.append(c); i+=1; continue
        if c in '{,':
            out.append(c); expect_key=True; i+=1; continue
        if expect_key and c.isspace():
            out.append(c); i+=1; continue
        if expect_key and (c.isalpha() or c=='_'):
            m=re.match(r'[A-Za-z_][A-Za-z0-9_]*', body[i:])
            k=m.group(0); rest=body[i+len(k):]
            if re.match(r'\s*:', rest):
                out.append('"%s"'%k); i+=len(k); expect_key=False; continue
        if c not in ' \t\r\n': expect_key=False
        out.append(c); i+=1
    return json.JSONDecoder().raw_decode(''.join(out))[0]
