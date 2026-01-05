#!/usr/bin/env python3
"""
Upload all generated block batches to Notion page.
Uses the Notion API to append blocks in sequence.
"""

import json
import requests
import time
import os

# Notion API配置
NOTION_API_KEY = os.environ.get('NOTION_API_KEY', '')  # 需要设置环境变量
PAGE_ID = '2de2cc4b-6a5f-81db-8ff2-c1ba50a4b756'
API_URL = f'https://api.notion.com/v1/blocks/{PAGE_ID}/children'

headers = {
    'Authorization': f'Bearer {NOTION_API_KEY}',
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
}

def upload_batch(batch_file):
    """Upload a single batch file to Notion."""
    print(f"Uploading {batch_file}...")
    
    with open(batch_file, 'r', encoding='utf-8') as f:
        blocks = json.load(f)
    
    # Notion API限制每次最多100个blocks
    # 我们的batch已经是90个，直接上传
    payload = {'children': blocks}
    
    response = requests.patch(API_URL, headers=headers, json=payload)
    
    if response.status_code == 200:
        print(f"  ✅ Successfully uploaded {len(blocks)} blocks")
        return True
    else:
        print(f"  ❌ Failed: {response.status_code} - {response.text[:200]}")
        return False

def main():
    if not NOTION_API_KEY:
        print("Error: NOTION_API_KEY environment variable not set")
        print("Please run: export NOTION_API_KEY='your_api_key'")
        return
    
    # 找到所有batch文件
    batch_files = sorted([f for f in os.listdir('.') if f.startswith('blocks_batch_') and f.endswith('.json')])
    
    print(f"Found {len(batch_files)} batch files to upload")
    print(f"Target page: {PAGE_ID}")
    print("-" * 50)
    
    success_count = 0
    for batch_file in batch_files:
        if upload_batch(batch_file):
            success_count += 1
        time.sleep(0.5)  # 避免API限流
    
    print("-" * 50)
    print(f"Upload complete: {success_count}/{len(batch_files)} batches successful")

if __name__ == '__main__':
    main()
