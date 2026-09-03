import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FORMATS, generateMatches, useTournament, type FormatId } from "@/lib/tournament-store";

export const Route = createFileRoute("/the-thuc")({
  head: () => ({
    meta: [
      { title: "Thể thức thi đấu — Nảy Court" },
      {
        name: "description",
        content:
          "Chọn thể thức giải Pickleball: chia bảng kết hợp loại trực tiếp, vòng tròn tính điểm hoặc thi đấu đồng đội.",
      },
      { property: "og:title", content: "Thể thức thi đấu — Nảy Court" },
      {
        property: "og:description",
        content: "Chia bảng / loại trực tiếp, vòng tròn, đồng đội — chọn một chạm.",
      },
    ],
  }),
  component: FormatPage,
});

function FormatPage() {
  const { state, update } = useTournament();
  const [note, setNote] = useState("");

  const choose = (id: FormatId) => update({ format: id, matches: [] });

  const buildSchedule = () => {
    if (state.teams.length < 2) {
      setNote("Cần ít nhất 2 đội.");
      return;
    }
    const matches = generateMatches(state.format, state.teams, state.groups, state.courts);
    update({ matches });
    setNote(`Đã tạo ${matches.length} trận đấu.`);
  };

  const teamOf = (id: string) => state.teams.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-7">
        <div className="grid gap-4">
          <div>
            <p className="eyebrow self-start">Trang 03 — Thể thức thi đấu</p>
            <h1 className="mt-1 text-balance font-head text-4xl font-black uppercase leading-none tracking-tighter">
              Chọn thể thức
            </h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {FORMATS.map((f) => {
              const active = state.format === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => choose(f.id)}
                  className={
                    active
                      ? "rounded-xl bg-white/80 p-4 text-left ring-2 ring-accent"
                      : "rounded-xl bg-white/60 p-4 text-left ring-1 ring-black/5"
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-head text-lg font-extrabold leading-none">{f.label}</span>
                    <span
                      className={
                        active
                          ? "grid size-5 place-items-center rounded-full border-2 border-accent bg-accent"
                          : "size-5 rounded-full border-2 border-line/30"
                      }
                    >
                      {active ? <span className="size-2 rounded-full bg-paper" /> : null}
                    </span>
                  </div>
                  <p className="mt-3 text-pretty text-sm text-line/70">{f.desc}</p>
                  {active ? (
                    <span className="mt-3 inline-block rounded-md bg-accent px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
                      Đang chọn
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-accent" onClick={buildSchedule}>
              ✓ Tạo lịch thi đấu
            </button>
            <Link to="/bang-ty-so" className="btn-ghost">
              Tiếp tục — Bảng tỷ số
            </Link>
            {note ? <span className="text-xs font-medium text-court">{note}</span> : null}
          </div>
        </div>
      </div>

      <div className="lg:col-span-5">
        <p className="eyebrow self-start">Lịch đã tạo</p>
        <h2 className="mt-1 text-balance font-head text-3xl font-black uppercase leading-none tracking-tighter">
          {state.matches.length} trận
        </h2>
        <div className="panel mt-4 divide-y divide-line/10 overflow-hidden">
          {state.matches.length === 0 ? (
            <p className="px-3.5 py-4 text-sm text-line/50">
              Chưa có lịch. Chọn thể thức rồi bấm “Tạo lịch thi đấu”.
            </p>
          ) : (
            state.matches.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                <span className="w-6 font-head font-bold text-line/40">{i + 1}</span>
                <span className="flex-1 truncate font-medium">
                  {teamOf(m.teamA)} <span className="text-line/40">vs</span> {teamOf(m.teamB)}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-line/50">
                  {m.groupName} · {m.court}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
