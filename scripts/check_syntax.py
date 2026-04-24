import sys

def check_syntax(code):
    stack = []
    i = 0
    while i < len(code):
        c = code[i]
        
        if c == '/' and i + 1 < len(code) and code[i+1] == '/':
            i = code.find('\n', i)
            if i == -1: break
        elif c == '/' and i + 1 < len(code) and code[i+1] == '*':
            i = code.find('*/', i)
            if i == -1: break
            i += 2
        elif c in '"\'`':
            start_quote = c
            i += 1
            while i < len(code):
                if code[i] == '\\':
                    i += 2
                    continue
                if code[i] == start_quote:
                    break
                # if it's a template literal and we hit ${, we need to push it onto the stack!
                if start_quote == '`' and code[i] == '$' and i+1<len(code) and code[i+1] == '{':
                    stack.append('`{')
                    i += 1
                    break
                i += 1
        elif c in '({[':
            stack.append(c)
        elif c in ')}]':
            if not stack:
                return f"Unmatched {c} at index {i}"
            top = stack.pop()
            if top == '`{' and c == '}':
                # Resume parsing template literal
                pass # But wait, we need to return to template literal parsing mode!
            elif not ((top == '(' and c == ')') or (top == '{' and c == '}') or (top == '[' and c == ']')):
                return f"Mismatch: expected {top}, got {c} at index {i}"
        
        i += 1
    
    if stack:
        return f"Leftover in stack: {stack}"
    return "All matched!"

with open("app/api/generate-reminder/route.ts") as f:
    code = f.read()
print(check_syntax(code))
