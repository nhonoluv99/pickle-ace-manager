import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  computeStandings,
  generateKnockout,
  useTournament,
  type Match,
  type StandingRow,
} from "@/lib/tournament-store";

export const Route = createFileRoute("/bang-ty-so")({
  head: () => ({
    meta: [
      { title: "Bảng tỷ số & xếp hạng — Nảy Court" },
      {
        name: "description",
        content:
          "Nhập điểm số từng trận Pickleball, bảng xếp hạng theo thắng/thua và hiệu số tự động cập nhật ngay.",
      },
      { property: "og:title", content: "Bảng tỷ số & xếp hạng — Nảy Court" },
      {
        property: "og:description",
        content: "Nhập tỷ số từng trận và theo dõi bảng xếp hạng cập nhật tự động.",
      },
    ],
  }),
  component: ScorePage,
});

function ScorePage() {
  const { state, update } = useTournament();
  const [note, setNote] = useState("");

  const teamOf = (id: string) => state.teams.find((t) => t.id === id)?.name ?? "—";

  const setScore = (id: string, side: "scoreA" | "scoreB", value: string) => {
    const n = value === "" ? null : Math.max(0, Math.min(99, Number(value) || 0));
    update({ matches: state.matches.map((m) => (m.id === id ? { ...m, [side]: n } : m)) });
  };

  const groupNames =
    state.groups.length > 0 ? state.groups.map((g) => g.name) : ["Vòng tròn"];

  const standingsFor = (groupName: string): StandingRow[] => {
    const teamIds =
      state.groups.find((g) => g.name === groupName)?.teamIds ?? state.teams.map((t) => t.id);
    const ms = state.matches.filter((m) => m.groupName === groupName);
    return computeStandings(teamIds, ms);
  };

  const makeKnockout = () => {
    if (state.groups.length === 0) {
      setNote("Cần chia bảng trước khi tạo vòng loại trực tiếp.");
      return;
    }
    const ko = generateKnockout(state.groups, standingsFor, state.courts);
    update({ matches: [...state.matches.filter((m) => m.stage === "group"), ...ko] });
    setNote(`Đã tạo ${ko.length} trận loại trực tiếp.`);
  };

  const groupMatches = state.matches.filter((m) => m.stage === "group");
  const koMatches = state.matches.filter((m) => m.stage === "ko");

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-balance font-head text-4xl font-black uppercase leading-none tracking-tighter">
              Nhập tỷ số
            </h1>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-line/60">
            Xếp hạng cập nhật ngay khi nhập
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          {state.matches.length === 0 ? (
            <div className="panel p-4 text-sm text-line/50">
              Chưa có trận nào. Sang trang Thể thức để tạo lịch thi đấu.
            </div>
          ) : null}

          {[...groupMatches, ...koMatches].map((m, i) => (
            <MatchCard
              key={m.id}
              match={m}
              index={i + 1}
              nameA={teamOf(m.teamA)}
              nameB={teamOf(m.teamB)}
              onScore={setScore}
            />
          ))}

          {state.format === "group_knockout" && state.matches.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-accent" onClick={makeKnockout}>
                ✓ Tạo vòng loại trực tiếp
              </button>
              {note ? <span className="text-xs font-medium text-court">{note}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="lg:col-span-5">
        <p className="eyebrow self-start">Bảng xếp hạng</p>
        <h2 className="mt-1 text-balance font-head text-3xl font-black uppercase leading-none tracking-tighter">
          Thứ hạng
        </h2>

        <div className="mt-4 grid gap-3">
          {groupNames.map((gname) => {
            const rows = standingsFor(gname);
            return (
              <div key={gname} className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b-2 border-line/10 px-3.5 py-2.5">
                  <span className="font-head font-extrabold italic text-line">{gname}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-line/50">
                    {rows.length} đội
                  </span>
                </div>
                <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem] items-center gap-2 border-b border-line/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-line/50">
                  <span>#</span>
                  <span>Đội</span>
                  <span className="text-center">T</span>
                  <span className="text-center">Đ</span>
                  <span className="text-center">Hiệu</span>
                </div>
                <div className="divide-y divide-line/10">
                  {rows.length === 0 ? (
                    <p className="px-3.5 py-3 text-sm text-line/50">Chưa có đội trong bảng.</p>
                  ) : (
                    rows.map((r, i) => (
                      <div
                        key={r.teamId}
                        className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem] items-center gap-2 px-3.5 py-3"
                      >
                        <span className="font-head font-bold text-line/70">{i + 1}</span>
                        <span className="truncate text-base font-medium">{teamOf(r.teamId)}</span>
                        <span className="text-center font-head font-bold">{r.win}</span>
                        <span className="text-center font-head font-bold text-court">
                          {r.points}
                        </span>
                        <span
                          className={
                            r.diff < 0
                              ? "text-center font-head font-bold text-accent"
                              : "text-center font-head font-bold"
                          }
                        >
                          {r.diff > 0 ? `+${r.diff}` : r.diff}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  index,
  nameA,
  nameB,
  onScore,
}: {
  match: Match;
  index: number;
  nameA: string;
  nameB: string;
  onScore: (id: string, side: "scoreA" | "scoreB", value: string) => void;
}) {
  const done = match.scoreA !== null && match.scoreB !== null;
  return (
    <div className="overflow-hidden rounded-xl bg-line text-paper ring-1 ring-black/5">
      <div className="flex items-center justify-between border-b border-paper/15 px-3.5 py-2.5">
        <span className="font-head font-extrabold italic">
          {match.court} · {match.groupName} · Trận {String(index).padStart(2, "0")}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-paper/60">
          {done ? "Đã có kết quả" : "Đang nhập"}
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-paper/15">
        <div className="px-3.5 py-3">
          <p className="truncate text-base font-medium">{nameA}</p>
          <input
            className="mt-2 w-full rounded-md bg-paper/10 py-1.5 text-center font-head text-2xl font-black leading-none text-paper outline-none"
            inputMode="numeric"
            placeholder="0"
            value={match.scoreA ?? ""}
            onChange={(e) => onScore(match.id, "scoreA", e.target.value)}
          />
        </div>
        <div className="px-3.5 py-3">
          <p className="truncate text-right text-base font-medium">{nameB}</p>
          <input
            className="mt-2 w-full rounded-md bg-paper/10 py-1.5 text-center font-head text-2xl font-black leading-none text-paper outline-none"
            inputMode="numeric"
            placeholder="0"
            value={match.scoreB ?? ""}
            onChange={(e) => onScore(match.id, "scoreB", e.target.value)}
          />
        </div>
      </div>
      <div className="border-t border-paper/15 px-3.5 py-2 text-xs text-paper/60">
        Thắng 3 điểm · hoà 1 điểm · xếp hạng theo điểm rồi hiệu số
      </div>
    </div>
  );
}
