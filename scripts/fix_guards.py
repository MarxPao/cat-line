with open('web-preview/app.js', 'r', encoding='utf8') as f:
    code = f.read().replace('\r\n', '\n')

# Guard attachSwipeListenersToTimeline and applyAccessibilityClasses for headless/test mocks
code = code.replace(
    "    const wrappers = document.querySelectorAll('.timeline-swipe-wrapper');",
    "    if (typeof document.querySelectorAll !== 'function') return;\n    const wrappers = document.querySelectorAll('.timeline-swipe-wrapper');"
)
code = code.replace(
    "    document.body.classList.toggle('dark-mode', Boolean(state.darkMode));\n    document.body.classList.toggle('large-font', Boolean(state.largeFont));",
    "    if (document.body && document.body.classList) {\n      document.body.classList.toggle('dark-mode', Boolean(state.darkMode));\n      document.body.classList.toggle('large-font', Boolean(state.largeFont));\n    }"
)

with open('web-preview/app.js', 'w', encoding='utf8') as f:
    f.write(code)

print("Guards added.")
