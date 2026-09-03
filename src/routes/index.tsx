import { createFileRoute, Link } from "@tanstack/react-router";
import { useTournament } from "@/lib/tournament-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tạo giải đấu Pickleball — Nảy Court" },
      {
        name: "description",
        content:
          "Tạo giải Pickleball: nhập tên giải, số sân vận hành, tên từng sân và ngày thi đấu chỉ trong một màn hình.",
      },
      { property: "og:title", content: "Tạo giải đấu Pickleball — Nảy Court" },
      {
        property: "og:description",
        content: "Khởi tạo giải Pickleball với danh sách sân và ngày thi đấu.",
      },
    ],
  }),
  component: CreateTournamentPage,
});

function CreateTournamentPage() {
  const { state, update, reset } = useTournament();

  const setCourtCount = (n: number) => {
    const count = Math.max(1, Math.min(16, n));
    const courts = Array.from(
      { length: count },
      (_, i) => state.courts[i] ?? `Sân ${i + 1}`,
    );
    update({ courtCount: count, courts });
  };

  const setCourtName = (i: number, name: string) => {
    const courts = [...state.courts];
    courts[i] = name;
    update({ courts });
  };

  const removeCourt = (i: number) => {
    const courts = state.courts.filter((_, idx) => idx !== i);
    update({ courts, courtCount: Math.max(1, courts.length) });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-balance font-head text-5xl font-black uppercase leading-none tracking-tighter sm:text-6xl">
        {state.name || "Cúp Nảy"}
      </h1>

      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
            Tên giải đấu
          </label>
          <input
            className="field mt-1.5"
            placeholder="Cúp Nảy Mở rộng 2025"
            maxLength={80}
            value={state.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
              Số sân
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                className="grid size-9 place-items-center rounded-lg bg-white/70 font-head font-bold ring-1 ring-black/5"
                onClick={() => setCourtCount(state.courts.length - 1)}
                aria-label="Giảm số sân"
              >
                −
              </button>
              <span className="flex-1 rounded-lg bg-white/70 py-2 text-center font-head text-lg font-black ring-1 ring-black/5">
                {state.courts.length}
              </span>
              <button
                className="grid size-9 place-items-center rounded-lg bg-accent font-head font-bold text-accent-foreground"
                onClick={() => setCourtCount(state.courts.length + 1)}
                aria-label="Tăng số sân"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
              Ngày thi đấu
            </label>
            <input
              type="text"
              className="field mt-1.5"
              placeholder="dd/mm/yyyy"
              value={state.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
            Danh sách sân
          </label>
          <div className="mt-1.5 space-y-2">
            {state.courts.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-white/70 px-3.5 py-2.5 ring-1 ring-black/5"
              >
                <span className="w-5 font-head font-bold text-line/40">{i + 1}</span>
                <input
                  className="flex-1 bg-transparent text-base font-medium outline-none"
                  value={c}
                  maxLength={40}
                  onChange={(e) => setCourtName(i, e.target.value)}
                />
                <button
                  className="text-line/40 hover:text-destructive"
                  onClick={() => removeCourt(i)}
                  aria-label={`Xoá ${c}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            className="mt-2 w-full rounded-lg border-2 border-dashed border-court/50 px-3 py-2 text-sm font-semibold text-court"
            onClick={() => setCourtCount(state.courts.length + 1)}
          >
            Thêm sân
          </button>
        </div>

        <div className="flex gap-3">
          <Link to="/quan-ly-doi" className="btn-accent flex-1">
            Tiếp tục — Quản lý đội
          </Link>
          <button className="btn-ghost" onClick={reset}>
            Xoá giải
          </button>
        </div>
      </div>
    </div>
  );
}
