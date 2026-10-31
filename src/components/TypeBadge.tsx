// 種類バッジ（docs/03_ui_design.md §3「項目詳細」1）。
// 色は種類ごと。勢力色（青／赤など）は使わない — 所属がネタバレになるため。
import { TYPE_LABEL } from '../lib/labels'
import type { EntityType } from '../types'

export default function TypeBadge({ type }: { type: EntityType }) {
  return (
    <span className="typeBadge" style={{ ['--badge-color' as string]: `var(--type-${type})` }}>
      {TYPE_LABEL[type]}
    </span>
  )
}
