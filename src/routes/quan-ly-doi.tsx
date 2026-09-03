import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  drawTeamsByRating,
  makePlayer,
  makeTeam,
  pairTeamsInOrder,
  splitGroups,
  useTournament,
  type PairMode,
} from "@/lib/tournament-store";

export const Route = createFileRoute("/quan-ly-doi")({
  head: () => ({
    meta: [
      { title: "Quản lý đội & bốc thăm — Nảy Court" },
      {
        name: "description",
        content:
          "Nhập danh sách VĐV kèm điểm trình, bốc thăm ngẫu nhiên cân bằng, bắt cặp từ đầu hoặc nhập tên đội, và chia bảng tự động.",
      },
      { property: "og:title", content: "Quản lý đội & bốc thăm — Nảy Court" },
      {
        property: "og:description",
        content: "Bốc thăm theo điểm trình và chia bảng tự động cho giải Pickleball.",
      },
    ],
  }),
  component: TeamsPage,
});

const MODES: Array<{ id: PairMode; label: string; desc: string }> = [
  { id: "random", label: "Bốc thăm ngẫu nhiên", desc: "Ghép cặp cân bằng theo điểm trình." },
  { id: "fixed", label: "Bắt cặp từ đầu", desc: "Ghép theo đúng thứ tự đã nhập." },
  { id: "manual_teams", label: "Nhập tên đội", desc: "Tự nhập sẵn danh sách đội." },
];

function TeamsPage() {
  const { state, update } = useTournament();
  const [playerName, setPlayerName] = useState("");
  const [rating, setRating] = useState("3.5");
  const [teamName, setTeamName] = useState("");
  const [note, setNote] = useState("");

  const addPlayer = () => {
    const name = playerName.trim();
    if (!name) return;
    const r = Number(rating.replace(",", "."));
    update({ players: [...state.players, makePlayer(name, Number.isFinite(r) ? r : 0)] });
    setPlayerName("");
  };

  const addTeam = () => {
    const name = teamName.trim();
    if (!name) return;
    update({ teams: [...state.teams, makeTeam(name)] });
    setTeamName("");
  };

  const removePlayer = (id: string) =>
    update({ players: state.players.filter((p) => p.id !== id) });

  const removeTeam = (id: string) =>
    update({
      teams: state.teams.filter((t) => t.id !== id),
      groups: state.groups.map((g) => ({ ...g, teamIds: g.teamIds.filter((x) => x !== id) })),
    });

  const setPlayerRating = (id: string, value: string) => {
    const r = Number(value.replace(",", "."));
    update({
      players: state.players.map((p) =>
        p.id === id ? { ...p, rating: Number.isFinite(r) ? r : 0 } : p,
      ),
    });
  };

  const draw = () => {
    if (state.pairMode === "manual_teams") {
      setNote("Chế độ nhập tên đội — không cần bốc thăm.");
      return;
    }
    if (state.players.length < state.teamSize) {
      setNote("Chưa đủ VĐV để bốc thăm.");
      return;
    }
    const teams =
      state.pairMode === "random"
        ? drawTeamsByRating(state.players, state.teamSize)
        : pairTeamsInOrder(state.players, state.teamSize);
    update({ teams, groups: [], matches: [] });
    setNote(`Đã tạo ${teams.length} đội.`);
  };

  const autoGroups = () => {
    if (state.teams.length < 2) {
      setNote("Cần ít nhất 2 đội để chia bảng.");
      return;
    }
    const groups = splitGroups(state.teams, state.players, state.groupCount);
    update({ groups, matches: [] });
    setNote(`Đã chia ${groups.length} bảng.`);
  };

  const teamOf = (id: string) => state.teams.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <div className="grid gap-3">
          <p className="eyebrow self-start">Trang 02 — Quản lý đội</p>
          <h1 className="mt-1 text-balance font-head text-4xl font-black uppercase leading-none tracking-tighter">
            Danh sách VĐV
          </h1>
        </div>

        <div className="panel mt-4 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-line/60">
            Thể thức đăng ký
          </p>
          <div className="mt-2 flex gap-2">
            {[1, 2, 4].map((n) => (
              <button
                key={n}
                onClick={() => update({ teamSize: n })}
                className={
                  state.teamSize === n
                    ? "flex-1 rounded-lg bg-line px-3 py-2 text-sm font-semibold text-paper"
                    : "flex-1 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-line/70 ring-1 ring-black/5"
                }
              >
                {n === 1 ? "Đơn (1)" : `${n} người / đội`}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-line/60">
            Cơ chế ghép đội
          </p>
          <div className="mt-2 space-y-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => update({ pairMode: m.id })}
                className={
                  state.pairMode === m.id
                    ? "w-full rounded-xl p-3 text-left ring-2 ring-accent"
                    : "w-full rounded-xl bg-white/60 p-3 text-left ring-1 ring-black/5"
                }
              >
                <span className="font-head text-base font-extrabold">{m.label}</span>
                <span className="mt-0.5 block text-xs text-line/60">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {state.pairMode === "manual_teams" ? (
          <div className="panel mt-4 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-line/60">
              Thêm đội
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="field"
                placeholder="Tên đội"
                maxLength={50}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTeam()}
              />
              <button className="btn-accent" onClick={addTeam}>
                Thêm
              </button>
            </div>
          </div>
        ) : (
          <div className="panel mt-4 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-line/60">
              Thêm VĐV & điểm trình
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="field"
                placeholder="Tên VĐV"
                maxLength={50}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              />
              <input
                className="field !w-24"
                placeholder="Trình"
                inputMode="decimal"
                maxLength={5}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              />
              <button className="btn-accent" onClick={addPlayer}>
                Thêm
              </button>
            </div>

            <div className="mt-3 divide-y divide-line/10 overflow-hidden rounded-xl bg-white/60 ring-1 ring-black/5">
              <div className="grid grid-cols-[1fr_5.5rem_2rem] items-center gap-2 border-b-2 border-line/10 px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-line/60">
                <span>VĐV</span>
                <span className="text-right">Trình</span>
                <span />
              </div>
              {state.players.length === 0 ? (
                <p className="px-3.5 py-4 text-sm text-line/50">Chưa có VĐV nào.</p>
              ) : (
                state.players.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_5.5rem_2rem] items-center gap-2 px-3.5 py-2.5"
                  >
                    <span className="truncate text-base font-medium">{p.name}</span>
                    <input
                      className="w-full rounded-md bg-white/80 py-1 text-right font-head font-bold text-line ring-1 ring-black/5"
                      inputMode="decimal"
                      value={String(p.rating)}
                      onChange={(e) => setPlayerRating(p.id, e.target.value)}
                    />
                    <button
                      className="justify-self-end text-line/40 hover:text-destructive"
                      onClick={() => removePlayer(p.id)}
                      aria-label={`Xoá ${p.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button className="btn-accent" onClick={draw}>
            ↻ Bốc thăm
          </button>
          <button className="btn-ghost" onClick={autoGroups}>
            Chia bảng tự động
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-line/60">
            Số bảng
          </label>
          <input
            className="field !w-20 !py-1.5 text-center"
            inputMode="numeric"
            value={String(state.groupCount)}
            onChange={(e) =>
              update({ groupCount: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })
            }
          />
          {note ? <span className="text-xs font-medium text-court">{note}</span> : null}
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow self-start">Kết quả ghép</p>
            <h2 className="mt-1 text-balance font-head text-3xl font-black uppercase leading-none tracking-tighter">
              Đội &amp; Bảng đấu
            </h2>
          </div>
          <Link to="/the-thuc" className="btn-ghost">
            Tiếp tục — Thể thức
          </Link>
        </div>

        <div className="panel mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-line/10 px-3.5 py-2.5">
            <span className="font-head font-extrabold italic text-line">Danh sách đội</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-line/50">
              {state.teams.length} đội
            </span>
          </div>
          {state.teams.length === 0 ? (
            <p className="px-3.5 py-4 text-sm text-line/50">
              Chưa có đội. Bốc thăm hoặc nhập tên đội để bắt đầu.
            </p>
          ) : (
            <div className="divide-y divide-line/10">
              {state.teams.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="w-6 font-head font-bold text-line/40">{i + 1}</span>
                  <span className="flex-1 text-base font-medium">{t.name}</span>
                  <button
                    className="text-line/40 hover:text-destructive"
                    onClick={() => removeTeam(t.id)}
                    aria-label={`Xoá ${t.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {state.groups.map((g) => (
            <div key={g.name} className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b-2 border-line/10 px-3.5 py-2.5">
                <span className="font-head font-extrabold italic text-line">{g.name}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-line/50">
                  {g.teamIds.length} đội
                </span>
              </div>
              <div className="divide-y divide-line/10">
                {g.teamIds.map((id) => (
                  <div key={id} className="px-3.5 py-2.5 text-base font-medium">
                    {teamOf(id)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
