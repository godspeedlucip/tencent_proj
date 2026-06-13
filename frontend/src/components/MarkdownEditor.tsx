import { Tabs, Input } from 'antd'

function mdToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export default function MarkdownEditor({ value, onChange, placeholder, rows = 15 }: Props) {
  return (
    <Tabs
      items={[
        {
          key: 'edit',
          label: '编辑',
          children: (
            <Input.TextArea
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder || '请使用 Markdown 格式写作…'}
              rows={rows}
              style={{ fontFamily: 'monospace' }}
            />
          ),
        },
        {
          key: 'preview',
          label: '预览',
          children: (
            <div
              style={{ minHeight: 200, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, lineHeight: 1.8, background: '#fafafa' }}
              dangerouslySetInnerHTML={{ __html: mdToHtml(value) || '<span style="color:#94a3b8">暂无内容</span>' }}
            />
          ),
        },
      ]}
    />
  )
}
