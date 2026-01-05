
import json
import re

input_file = 'PROJECT_HISTORY.md'

def create_text(content, bold=False):
    annotations = {"bold": bold}
    return {
        "type": "text",
        "text": {"content": content},
        "annotations": annotations
    }

def create_block(type, content_key, text_content, children=None):
    block = {
        "object": "block",
        "type": type,
        type: {
            "rich_text": text_content
        }
    }
    if children:
        block[type]["children"] = children
    return block

blocks = []
current_toggle_children = []
in_toggle = False

with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Limit to first 30 commits to avoid huge payload ~ 200 lines roughly
# actually let's output until we reach a sane limit of blocks, e.g. 80.
MAX_BLOCKS = 90 # Increased to reduce number of upload requests (Notion limit is 100)
batch_index = 0
block_count = 0

for line in lines:
    line = line.strip()
    if not line:
        continue

    if block_count >= MAX_BLOCKS and not in_toggle:
        # Save current batch and start new one
        with open(f'blocks_batch_{batch_index}.json', 'w', encoding='utf-8') as f:
            json.dump(blocks, f)
        print(f"Generated blocks_batch_{batch_index}.json with {len(blocks)} blocks")
        
        blocks = []
        block_count = 0
        batch_index += 1
        
    if line.startswith('# '):
        blocks.append(create_block("heading_1", "heading_1", [create_text(line[2:])]))
        block_count += 1
        
    elif line.startswith('### '):
        blocks.append(create_block("heading_3", "heading_3", [create_text(line[4:])]))
        block_count += 1
        
    elif line.startswith('- '):
        # Check for bold parts **Key**: Value
        parts = re.split(r'(\*\*.*?\*\*)', line[2:])
        rich_text = []
        for part in parts:
            if part.startswith('**') and part.endswith('**'):
                rich_text.append(create_text(part[2:-2], bold=True))
            else:
                if part:
                    rich_text.append(create_text(part))
        
        block = create_block("bulleted_list_item", "bulleted_list_item", rich_text)
        
        if in_toggle:
            current_toggle_children.append(block)
        else:
            blocks.append(block)
            block_count += 1
            
    elif line.startswith('<details>'):
        in_toggle = True
        current_toggle_children = []
        
    elif line.startswith('</details>'):
        in_toggle = False
        toggle_block = create_block("toggle", "toggle", [create_text("文件变更列表 (Files Changed)")], children=current_toggle_children)
        blocks.append(toggle_block)
        block_count += 1
        current_toggle_children = []
        
    else:
        if not in_toggle:
             blocks.append(create_block("paragraph", "paragraph", [create_text(line)]))
             block_count += 1

# Save the last batch
if blocks:
    with open(f'blocks_batch_{batch_index}.json', 'w', encoding='utf-8') as f:
        json.dump(blocks, f)
    print(f"Generated blocks_batch_{batch_index}.json with {len(blocks)} blocks")

