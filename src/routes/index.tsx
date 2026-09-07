import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTournament } from "@/lib/tournament-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tạo giải đấu Pickleball — Nảy Court" },
      {
        name: "description",
        content:
          "Tạo giải Pickleball: tên giải, ngày thi đấu chọn bằng lịch, địa điểm và danh sách sân — tất cả chỉnh được bất cứ lúc nào.",
      },
      { property: "og:title", content: "Tạo giải đấu Pickleball — Nảy Court" },
      {
        property: "og:description",
        content: "Khởi tạo giải Pickleball với địa điểm, danh sách sân và ngày thi đấu.",
      },
    ],
  }),
  component: CreateTournamentPage,
});

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDMY(d: Date) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fromDMY(s: string): Date | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return undefined;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function CreateTournamentPage() {
  const { state, update, reset } = useTournament();
  const [openCal, setOpenCal] = useState(false);

  const title = state.name || "Cúp Nảy";
  const titleSize = Math.max(1.5, Math.min(3.75, 46 / Math.max(8, title.length)));

  const setCourtCount = (n: number) => {
    const count = Math.max(1, Math.min(24, n));
    const courts = Array.from({ length: count }, (_, i) => state.courts[i] ?? `Sân ${i + 1}`);
    update({ courts });
  };

  const setCourtName = (i: number, name: string) => {
    const courts = [...state.courts];
    courts[i] = name;
    update({ courts });
  };

  const removeCourt = (i: number) => {
    const courts = state.courts.filter((_, idx) => idx !== i);
    update({ courts: courts.length ? courts : ["Sân 1"] });
  };

  return (
    <div className="max-w-2xl">
      <div className="flex h-[4.75rem] items-end">
        <h1
          className="w-full truncate whitespace-nowrap font-head font-black uppercase tracking-tighter"
          style={{ fontSize: `${titleSize}rem`, lineHeight: 1.18 }}
        >
          {title}
        </h1>
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
            Tên giải đấu
          </label>
          <input
            className="field mt-1.5 truncate"
            style={{
              fontSize: `${Math.max(0.85, Math.min(1.15, 26 / Math.max(20, state.name.length)))}rem`,
            }}
            placeholder="Cúp Nảy Mở rộng 2026"
            maxLength={90}
            value={state.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
              Ngày thi đấu <span className="font-normal normal-case text-line/40">(tuỳ chọn)</span>
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                className="field"
                placeholder="dd/mm/yyyy"
                value={state.date}
                onChange={(e) => update({ date: e.target.value })}
              />
              <Popover open={openCal} onOpenChange={setOpenCal}>
                <PopoverTrigger asChild>
                  <button
                    className="grid size-[42px] shrink-0 place-items-center rounded-lg bg-white/70 text-lg ring-1 ring-black/5"
                    aria-label="Mở lịch chọn ngày"
                  >
                    📅
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={fromDMY(state.date)}
                    onSelect={(d) => {
                      if (d) update({ date: toDMY(d) });
                      setOpenCal(false);
                    }}
                    initialFocus
                    className="pointer-events-auto p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
              Địa điểm <span className="font-normal normal-case text-line/40">(tuỳ chọn)</span>
            </label>
            <input
              className="field mt-1.5"
              placeholder="Quận 7, TP.HCM"
              value={state.venue}
              onChange={(e) => update({ venue: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
            Tên cụm sân <span className="font-normal normal-case text-line/40">(tuỳ chọn)</span>
          </label>
          <input
            className="field mt-1.5"
            placeholder="Nảy Pickleball Arena"
            value={state.venueName}
            onChange={(e) => update({ venueName: e.target.value })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wide text-line/70">
              Danh sách sân
            </label>
            <div className="flex items-center gap-2">
              <button
                className="grid size-8 place-items-center rounded-lg bg-white/70 font-head font-bold ring-1 ring-black/5"
                onClick={() => setCourtCount(state.courts.length - 1)}
                aria-label="Giảm số sân"
              >
                −
              </button>
              <span className="w-8 text-center font-head text-lg font-black">
                {state.courts.length}
              </span>
              <button
                className="grid size-8 place-items-center rounded-lg bg-accent font-head font-bold text-accent-foreground"
                onClick={() => setCourtCount(state.courts.length + 1)}
                aria-label="Tăng số sân"
              >
                +
              </button>
            </div>
          </div>

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
          <Link to="/noi-dung" className="btn-accent flex-1">
            Tiếp tục — Nội dung thi đấu
          </Link>
          <button className="btn-ghost" onClick={reset}>
            Xoá giải
          </button>
        </div>
      </div>
    </div>
  );
}
