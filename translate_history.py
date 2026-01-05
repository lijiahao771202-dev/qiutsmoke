import re

input_file = 'PROJECT_HISTORY.md'
output_file = 'PROJECT_HISTORY_CN.md'

# Commit type mappings
type_map = {
    'feat': '✨ 新功能',
    'fix': '🐛 修复',
    'style': '💄 样式',
    'chore': '🔧 维护',
    'perf': '⚡️ 性能',
    'refactor': '♻️ 重构',
    'docs': '📚 文档',
    'test': '✅ 测试',
    'build': '👷 构建',
    'ci': '💚 CI',
    'revert': '⏪ 回滚'
}

# Common word mappings for description
word_map = {
    'implement': '实现',
    'add': '添加',
    'remove': '移除',
    'delete': '删除',
    'update': '更新',
    'fix': '修复',
    'resolve': '解决',
    'refactor': '重构',
    'optimize': '优化',
    'enhance': '增强',
    'improve': '改进',
    'restore': '恢复',
    'revert': '回滚',
    'create': '创建',
    'initial commit': '初始化提交',
    'merge': '合并',
    'bump': '升级',
    'support': '支持',
    'disable': '禁用',
    'hide': '隐藏',
    'show': '显示',
    'animate': '动画',
    'animation': '动画',
    'redesign': '重新设计',
    'design': '设计',
    'layout': '布局',
    'style': '样式',
    'component': '组件',
    'page': '页面',
    'feature': '功能',
    'bug': '缺陷',
    'issue': '问题',
    'error': '错误',
    'navigation': '导航',
    'header': '头部',
    'footer': '底部',
    'sidebar': '侧边栏',
    'modal': '模态框',
    'button': '按钮',
    'input': '输入框',
    'card': '卡片',
    'list': '列表',
    'loading': '加载中',
    'data': '数据',
    'api': '接口',
    'backend': '后端',
    'frontend': '前端',
    'database': '数据库',
    'schema': '模式',
    'migration': '迁移',
    'deployment': '部署',
    'configure': '配置',
    'config': '配置',
    'setup': '设置',
    'install': '安装',
    'dependency': '依赖',
    'dependencies': '依赖',
    'test': '测试',
    'documentation': '文档',
    'typo': '拼写错误',
    'rename': '重命名',
    'move': '移动',
    'ensure': '确保',
    'allow': '允许',
    'prevent': '防止',
    'avoid': '避免',
    'handle': '处理',
    'integration': '集成',
    'provider': '提供者',
    'context': '上下文',
    'hook': '钩子',
    'state': '状态',
    'effect': '副作用',
    'logic': '逻辑',
    'util': '工具',
    'utils': '工具',
    'helper': '助手',
    'service': '服务',
    'controller': '控制器',
    'route': '路由',
    'router': '路由器',
    'view': '视图',
    'template': '模板',
    'asset': '资源',
    'image': '图片',
    'icon': '图标',
    'font': '字体',
    'color': '颜色',
    'theme': '主题',
    'dark mode': '深色模式',
    'light mode': '浅色模式',
    'responsive': '响应式',
    'mobile': '移动端',
    'desktop': '桌面端',
    'ios': 'iOS',
    'android': 'Android',
    'user': '用户',
    'auth': '认证',
    'login': '登录',
    'logout': '登出',
    'register': '注册',
    'profile': '个人资料',
    'settings': '设置',
    'dashboard': '仪表盘',
    'home': '首页',
    'detail': '详情',
    'search': '搜索'
}

def translate_text(text):
    # Case insensitive replacement
    processed_text = text
    for en, cn in word_map.items():
        pattern = re.compile(re.escape(en), re.IGNORECASE)
        processed_text = pattern.sub(cn, processed_text)
    return processed_text

def parse_commit_type(msg):
    match = re.match(r'(\w+)(?:\(([^)]+)\))?:\s*(.+)', msg)
    if match:
        ctype = match.group(1).lower()
        scope = match.group(2)
        desc = match.group(3)
        return ctype, scope, desc
    return None, None, msg

print("Reading input file...")
try:
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
except FileNotFoundError:
    print(f"Error: {input_file} not found.")
    exit(1)

translated_lines = []
print("Processing lines...")

for line in lines:
    if line.startswith('# Project Version History'):
        translated_lines.append('# 项目版本历史\n')
    elif line.startswith('Generated on'):
        translated_lines.append(line.replace('Generated on', '生成时间：'))
    elif line.strip().startswith('- **Commit**:'):
        translated_lines.append(line)
    elif line.strip().startswith('- **Author**:'):
        translated_lines.append(line)
    elif line.strip().startswith('- **Message**:'):
        parts = line.split('**Message**: **', 1)
        if len(parts) > 1:
            msg_content = parts[1].strip().rstrip('*').rstrip()
            ctype, scope, desc = parse_commit_type(msg_content)
            
            if ctype:
                prefix = type_map.get(ctype, ctype)
                scope_str = f"({scope})" if scope else ""
                trans_desc = translate_text(desc)
                translated_lines.append(f"- **提交信息**: **{prefix}{scope_str}: {trans_desc}**\n")
            else:
                trans_msg = translate_text(msg_content)
                translated_lines.append(f"- **提交信息**: **{trans_msg}**\n")
        else:
            translated_lines.append(line)
    elif '<details><summary>Files Changed</summary>' in line:
        translated_lines.append(line.replace('Files Changed', '文件变更列表'))
    else:
        translated_lines.append(line)

print("Writing output file...")
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(translated_lines)

print(f"Successfully generated {output_file}")
