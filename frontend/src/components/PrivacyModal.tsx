import { Modal } from 'antd'
import { useState } from 'react'

const STORAGE_KEY = 'intern_energy_station_privacy_consent'

export default function PrivacyModal() {
  const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY))

  function handleAgree() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  return (
    <Modal
      title="数据与隐私安全告知书"
      open={open}
      onOk={handleAgree}
      onCancel={handleAgree}
      okText="已知晓并同意"
      cancelText="关闭"
      closable={false}
      maskClosable={false}
    >
      <div style={{ lineHeight: 2 }}>
        <p><strong>「实习能量站」郑重承诺：</strong></p>
        <ul style={{ paddingLeft: 20 }}>
          <li>本系统定位为"成长导航"而非"职场监控"。</li>
          <li>系统<strong>绝不读取</strong>个人私聊记录。</li>
          <li>系统<strong>不监控</strong>设备行为、浏览器历史、键鼠操作或工时时长。</li>
          <li>AI 分析仅基于：系统内公开任务、你主动提交的周报/Check-in、导师主动反馈及沉淀的项目产出。</li>
          <li>情绪胶囊映射的压力值<strong>仅导师和HR可见</strong>，不对实习生本人和其他实习生展示。</li>
          <li>所有高风险、低适配结论<strong>必须经过导师或HR人工复核</strong>，AI 不会单独做出人事决定。</li>
        </ul>
        <p style={{ marginTop: 12, color: '#666' }}>
          我们通过这份告知书建立信任——如果你对数据使用有任何疑问，随时通过导师或HR向我们反馈。
        </p>
      </div>
    </Modal>
  )
}
