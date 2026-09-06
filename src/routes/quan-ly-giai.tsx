import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  computeStandings,
  entryName,
  generateGroupMatches,
  generateKnockout,
  propagateKnockout,
  useTournament,
  type Match,
  type TEvent,
} from "@/lib/tournament-store";

export const Route = createFileRoute("/quan-ly-giai")({
  head: () => ({
    meta: [
      { title: "Quản lý giải đấu — Nảy Court" },
      {
        name: "description",
        content:
          "Điều hành giải Pickleball: lịch vòng bảng theo số sân, bảng xếp hạng tự động, nhánh loại trực tiếp, phân sân, trọng tài và nhập điểm từng trận.",
      },
      { property: "og:title", content: "Quản lý giải đấu — Nảy Court" },
      {
        property: "og:description",
        content: "Vòng bảng và loại trực tiếp trong một màn hình điều hành.",
      },
    ],
  }),
  component: ManagePage,
});

function ManagePage() {
  const { state, update, updateEvent, updateMatch } = useTournament();
  const [activeId, setActiveId] = useState(state.events[0]?.id ?? "");
  const [tab, setTab] = useState<"group" | "ko">("group");
  const [note, setNote] = useState("");

  const ev: TEvent | undefined = state.events.find((e) => e.id === activeId) ?? state.events[0];
  const entries = useMemo(
    () => state.entries.filter((e) => ev && e.eventId === ev.id),
    [state.entries, ev],
  );
  const matches = useMemo(
    () => state.matches.filter((m) => ev && m.eventId === ev.id),
    [state.matches, ev],
  );

  if (!ev) {
    return (
      <div className="max-w-xl">
        <h1 className="font-head text-4xl font-black uppercase tracking-tighter">
          Quản lý giải đấu
        </h1>
        <p className="mt-3 text-sm text-line/60">Chưa có nội dung nào để điều hành.</p>
        <Link to="/noi-dung" className="btn-accent mt-4">
          Tạo nội dung
        </Link>
      </div>
    );
  }

  const nameOf = (id: string | null) =>
    id ? entryName(entries.find((e) => e.id === id)) : "Chờ xác định";

  const groupMatches = matches.filter((m) => m.stage === "group");
  const koMatches = matches.filter((m) => m.stage === "ko");

  const buildGroups = () => {
    if (entries.length < 2) {
      setNote("Cần ít nhất 2 đội.");
      return;
    }
    const fresh = generateGroupMatches(ev, entries, state.courts);
    update({
      matches: [
        ...state.matches.filter((m) => !(m.eventId === ev.id && m.stage === "group")),
        ...fresh,
      ],
    });
    setNote(`Đã tạo ${fresh.length} trận vòng bảng.`);
  };

  const buildKo = () => {
    const fresh = generateKnockout(ev, entries, groupMatches, state.courts);
    if (!fresh.length) {
      setNote("Chưa đủ dữ liệu vòng bảng để tạo nhánh loại trực tiếp.");
      return;
    }
    update({
      matches: [...state.matches.filter((m) => !(m.eventId === ev.id && m.stage === "ko")), ...fresh],
    });
    setTab("ko");
    setNote(`Đã tạo ${fresh.length} trận loại trực tiếp.`);
  };

  const setScore = (m: Match, key: "scoreA" | "scoreB", raw: string) => {
    const v = raw.trim() === "" ? null : Number(raw);
    const patched = state.matches.map((x) =>
      x.id === m.id
        ? {
            ...x,
            [key]: v,
            status: (v !== null && (key === "scoreA" ? x.scoreB : x.scoreA) !== null
              ? "done"
              : x.status) as Match["status"],
          }
        : x,
    );
    update({ matches: propagateKnockout(patched, ev.id) });
  };

  const shown = tab === "group" ? groupMatches : koMatches;
  const live = shown.filter((m) => m.status === "live");
  const waiting = shown.filter((m) => m.status === "pending");
  const done = shown.filter((m) => m.status === "done");

  const MatchRow = ({ m }: { m: Match }) => (
    <div className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span className="rounded-md bg-line/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-line/70">
            {m.groupName} · V{m.round}
          </span>
          <span className="truncate">
            {nameOf(m.aId)} <span className="text-line/40">vs</span> {nameOf(m.bId)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className="rounded-md bg-white/70 px-2 py-1 text-xs font-semibold ring-1 ring-black/5"
            value={m.court}
            onChange={(e) => updateMatch(m.id, { court: e.target.value })}
          >
            {state.courts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className="w-36 rounded-md bg-white/70 px-2 py-1 text-xs font-medium ring-1 ring-black/5 outline-none"
            placeholder="Trọng tài"
            value={m.referee}
            onChange={(e) => updateMatch(m.id, { referee: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="field w-16 text-center"
          inputMode="numeric"
          placeholder="—"
          value={m.scoreA ?? ""}
          onChange={(e) => setScore(m, "scoreA", e.target.value)}
        />
        <span className="text-line/40">:</span>
        <input
          className="field w-16 text-center"
          inputMode="numeric"
          placeholder="—"
          value={m.scoreB ?? ""}
          onChange={(e) => setScore(m, "scoreB", e.target.value)}
        />
        {m.status === "done" ? (
          <span className="rounded-md bg-court px-2 py-1 text-[11px] font-semibold text-paper">
            Xong
          </span>
        ) : (
          <>
            <button
              className="btn-ghost !px-2 !py-1 text-xs"
              onClick={() =>
                updateMatch(m.id, { status: m.status === "live" ? "pending" : "live" })
              }
            >
              {m.status === "live" ? "Tạm dừng" : "Bắt đầu"}
            </button>
            <Link
              to="/cham-diem/$matchId"
              params={{ matchId: m.id }}
              className="btn-accent !px-2 !py-1 text-xs"
            >
              Chấm điểm
            </Link>
          </>
        )}
      </div>
    </div>
  );

  const Section = ({ title, list }: { title: string; list: Match[] }) => (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-line/60">
        {title} · {list.length}
      </p>
      <div className="panel mt-2 divide-y divide-line/10 overflow-hidden">
        {list.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-line/40">Trống</p>
        ) : (
          list.map((m) => <MatchRow key={m.id} m={m} />)
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-balance font-head text-4xl font-black uppercase leading-none tracking-tighter">
        Quản lý giải đấu
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {state.events.map((e) => (
          <button
            key={e.id}
            onClick={() => setActiveId(e.id)}
            className={
              e.id === ev.id
                ? "rounded-lg bg-line px-3 py-2 text-sm font-semibold text-paper"
                : "rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-line/70 ring-1 ring-black/5"
            }
          >
            {e.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className={
            tab === "group"
              ? "rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
              : "rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-line/70 ring-1 ring-black/5"
          }
          onClick={() => setTab("group")}
        >
          Vòng bảng
        </button>
        <button
          className={
            tab === "ko"
              ? "rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
              : "rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-line/70 ring-1 ring-black/5"
          }
          onClick={() => setTab("ko")}
        >
          Loại trực tiếp
        </button>
        <span className="mx-1 h-5 w-px bg-line/15" />
        {tab === "group" ? (
          <button className="btn-accent" onClick={buildGroups}>
            Tạo lịch vòng bảng
          </button>
        ) : (
          <>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-line/70">
              Số đội đi tiếp / bảng
              <input
                type="number"
                min={1}
                max={4}
                className="field w-16 text-center"
                value={ev.advancePerGroup}
                onChange={(e) =>
                  updateEvent(ev.id, {
                    advancePerGroup: Math.max(1, Math.min(4, Number(e.target.value) || 1)),
                  })
                }
              />
            </label>
            <button className="btn-accent" onClick={buildKo}>
              Tạo nhánh loại trực tiếp
            </button>
          </>
        )}
        {note ? <span className="text-xs font-medium text-court">{note}</span> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Section title="Đang diễn ra" list={live} />
          <Section title="Chờ thi đấu" list={waiting} />
          <Section title="Đã kết thúc" list={done} />
        </div>

        <div className="lg:col-span-5">
          <p className="eyebrow mt-4">Bảng xếp hạng</p>
          {(ev.groups.length
            ? ev.groups
            : [{ name: "Vòng tròn", entryIds: entries.map((e) => e.id) }]
          ).map((g) => {
            const rows = computeStandings(
              g.entryIds,
              groupMatches.filter((m) => m.groupName === g.name),
              ev,
            );
            return (
              <div key={g.name} className="panel mt-3 overflow-hidden">
                <p className="px-3 pt-3 font-head text-lg font-black uppercase tracking-tight">
                  {g.name}
                </p>
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-line/50">
                      <th className="px-3 py-1.5 text-left">Đội</th>
                      <th className="px-1 py-1.5">Tr</th>
                      <th className="px-1 py-1.5">T</th>
                      <th className="px-1 py-1.5">B</th>
                      <th className="px-1 py-1.5">HS</th>
                      <th className="px-3 py-1.5">Đ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.entryId} className="border-t border-line/10">
                        <td className="max-w-[160px] truncate px-3 py-1.5">
                          <span className="mr-1.5 font-head font-bold text-line/40">{i + 1}</span>
                          {nameOf(r.entryId)}
                        </td>
                        <td className="px-1 py-1.5 text-center">{r.played}</td>
                        <td className="px-1 py-1.5 text-center">{r.win}</td>
                        <td className="px-1 py-1.5 text-center">{r.loss}</td>
                        <td className="px-1 py-1.5 text-center">{r.diff}</td>
                        <td className="px-3 py-1.5 text-center font-bold">{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
