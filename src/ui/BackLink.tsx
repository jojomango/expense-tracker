import { useNavigate } from 'react-router-dom'

/**
 * 移除全域標題列後（UI-SPEC.md §3.1：底部分頁列取代標題列連結），
 * 不在分頁列上的次要頁面（錢包管理、分類管理、各種表單……）需要自己的返回入口，
 * 否則在 PWA 獨立視窗模式下使用者會卡在該頁——瀏覽器的返回鍵不一定存在。
 *
 * 沒有指定 `to` 時用瀏覽器歷史返回（`navigate(-1)`），符合「回到剛才那一步」的直覺。
 */
export default function BackLink({ to, label = '返回' }: { to?: string; label?: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className="mb-1 text-caption text-fg2"
    >
      ‹ {label}
    </button>
  )
}
