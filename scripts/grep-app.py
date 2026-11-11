import re, sys
pat = re.compile(sys.argv[1])
L = open('web-preview/app.js', encoding='utf-8').read().split('\n')
o = open('scratch-speech.txt', 'w', encoding='utf-8')
for i, l in enumerate(L):
    if pat.search(l):
        o.write(str(i + 1) + ' ' + l.strip()[:200] + '\n')
