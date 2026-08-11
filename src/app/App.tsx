import { todayIso } from '../domain/iso-date'

export default function App() {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">記帳本</h1>
        <p className="mt-2 text-sm text-slate-500">Phase 0 — 地基就緒</p>
        <p className="mt-1 text-xs text-slate-400" data-testid="today">
          {todayIso(new Date())}
        </p>
      </div>
    </main>
  )
}
