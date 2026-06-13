import { Input, Button, Space } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Annotation } from '../types'

interface Props {
  annotations: Annotation[]
  onChange: (annotations: Annotation[]) => void
}

export default function ReviewAnnotations({ annotations, onChange }: Props) {
  const addAnnotation = () => {
    onChange([...annotations, { line: annotations.length + 1, text: '' }])
  }

  const updateAnnotation = (index: number, field: 'line' | 'text', value: string | number) => {
    const updated = [...annotations]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeAnnotation = (index: number) => {
    onChange(annotations.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>逐段批注</span>
        <Button size="small" icon={<PlusOutlined />} onClick={addAnnotation}>添加批注</Button>
      </div>
      {annotations.map((ann, i) => (
        <Space key={i} style={{ display: 'flex', marginBottom: 8 }} align="start">
          <Input
            size="small"
            type="number"
            min={1}
            value={ann.line}
            onChange={e => updateAnnotation(i, 'line', parseInt(e.target.value) || 1)}
            style={{ width: 60 }}
            placeholder="行号"
          />
          <Input
            size="small"
            value={ann.text}
            onChange={e => updateAnnotation(i, 'text', e.target.value)}
            style={{ width: 400 }}
            placeholder="批注内容"
          />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeAnnotation(i)} />
        </Space>
      ))}
    </div>
  )
}
