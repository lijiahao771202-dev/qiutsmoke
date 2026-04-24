import re

def check_brackets(code):
    # Remove single line comments
    code = re.sub(r'//.*', '', code)
    # Remove block comments
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    
    # We will iterate character by character
    stack = []
    i = 0
    in_string = False
    string_char = None
    
    while i < len(code):
        c = code[i]
        if in_string:
            if c == '\\':
                i += 2
                continue
            if c == string_char:
                in_string = False
                string_char = None
            elif string_char == '`' and c == '$' and i+1 < len(code) and code[i+1] == '{':
                stack.append('`{')
                in_string = False
                string_char = None
                i += 1
            i += 1
            continue
            
        if c in '"\'`':
            in_string = True
            string_char = c
        elif c in '({[':
            stack.append((c, i))
        elif c in ')}]':
            if not stack:
                return f"Unmatched {c} at index {i}"
            top_char, _ = stack.pop()
            if top_char == '`{' and c == '}':
                # Resume template literal
                in_string = True
                string_char = '`'
            elif not ((top_char == '(' and c == ')') or (top_char == '{' and c == '}') or (top_char == '[' and c == ']')):
                return f"Mismatch: expected {top_char}, got {c} at index {i} near {code[i-20:i+20]}"
        i += 1
        
    if stack:
        top_char, pos = stack[-1]
        
        lineno = code[:pos].count('\n') + 1
        return f"Leftover in stack: {[s[0] for s in stack]}. Last opened at line {lineno}"
    return "All matched!"

with open("app/api/generate-reminder/route.ts") as f:
    code = f.read()
print(check_brackets(code))
