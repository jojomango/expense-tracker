import { NavLink, useLocation } from 'react-router-dom'

/**
 * UI-SPEC.md §3.1 — 底部分頁列，取代原本標題列的「分類 / 統計 / 設定」連結。
 * 設定不在分頁列上，從首頁右上角進入（見 Home.tsx §4.1）。
 *
 * 在交易表單頁隱藏（那些頁面是全螢幕，記帳頁在 Phase 9 才會長成金額優先的樣子，
 * 但「表單頁不顯示分頁列」這條骨架規則從這個 phase 就先立好）。
 */
const HIDDEN_ON = [/^\/transactions\/new$/, /^\/transactions\/[^/]+\/edit$/]

function HomeIcon() {
  return <span className="block h-5 w-5 rounded-[6px] border-2 border-current" aria-hidden="true" />
}

function StatsIcon() {
  return (
    <span className="flex h-[18px] items-end gap-[3px]" aria-hidden="true">
      <span className="h-[10px] w-1 rounded-sm bg-current" />
      <span className="h-[18px] w-1 rounded-sm bg-current" />
      <span className="h-[14px] w-1 rounded-sm bg-current" />
    </span>
  )
}

export default function BottomTabBar() {
  const location = useLocation()
  if (HIDDEN_ON.some((re) => re.test(location.pathname))) return null

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex h-[84px] items-start justify-around border-t border-sep bg-barbg pt-2 backdrop-blur"
    >
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex min-h-11 w-16 flex-col items-center justify-center gap-1 text-tab ${isActive ? 'text-accent' : 'text-fg3'}`
        }
      >
        <HomeIcon />
        首頁
      </NavLink>

      <NavLink
        to="/transactions/new"
        aria-label="記一筆"
        className="-mt-5 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
      >
        <span className="text-[30px] font-light leading-none">＋</span>
      </NavLink>

      <NavLink
        to="/stats"
        className={({ isActive }) =>
          `flex min-h-11 w-16 flex-col items-center justify-center gap-1 text-tab ${isActive ? 'text-accent' : 'text-fg3'}`
        }
      >
        <StatsIcon />
        統計
      </NavLink>
    </nav>
  )
}
