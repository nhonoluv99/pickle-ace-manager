import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addMinutes,
  buildTimeline,
  computeStandings,
  entryName,
  generateGroupMatches,
  generateKnockout,
  groupColor,
  groupTag,
  propagateKnockout,
  useTournament,
  type Entry,
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
          "Điều hành giải Pickleball: lịch vòng bảng theo vòng và màu bảng, timeline theo sân và khung giờ, nhánh loại trực tiếp, phân sân, trọng tài và nhập điểm từng trận.",
      },
      { property: "og:title", content: "Quản lý giải đấu — Nảy Court" },
      {
        property: "og:description",
        content: "Vòng bảng, timeline theo sân và loại trực tiếp trong một màn hình điều hành.",
      },
    ],
  }),
  component: ManagePage,
});

/* ---------------- Ô nhập điểm (giữ nguyên vị trí cuộn khi gõ) ---------------- */

function ScoreBox({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [raw, setRaw] = useState(value === null ? "" : String(value));
  useEffect(() => {
    setRaw(value === null ? "" : String(value));
  }, [value]);
  return (
    <input
      className="w-12 rounded-md bg-card px-1 py-1 text-center text-sm font-bold ring-1 ring-line/20 outline-none focus:ring-2 focus:ring-court"
      inputMode="numeric"
      placeholder="—"
      value={raw}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9]/g, "");
        setRaw(t);
        onCommit(t === "" ? null : Number(t));
      }}
    />
  );
}

type CardProps = {
  m: Match;
  nameA: string;
  nameB: string;
  onScore: (key: "scoreA" | "scoreB", v: number | null) => void;
  onStatus: (s: Match["status"]) => void;
  onReset: () => void;
  courts: string[];
  onCourt: (c: string) => void;
  onReferee: (r: string) => void;
  compact?: boolean | undefined;
};

function MatchCard({
  m,
  nameA,
  nameB,
  onScore,
  onStatus,
  onReset,
  courts,
  onCourt,
  onReferee,
  compact,
}: CardProps) {
  const c = groupColor(m.groupName);
  const aWin = m.scoreA !== null && m.scoreB !== null && m.scoreA > m.scoreB;
  const bWin = m.scoreA !== null && m.scoreB !== null && m.scoreB > m.scoreA;
  return (
    <div
      className="rounded-xl p-2.5 ring-1 ring-line/15"
      style={{ backgroundColor: m.status === "done" ? "var(--muted)" : c.bg }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: c.dot, color: "white" }}
        >
          {groupTag(m.groupName)} · V{m.round}
        </span>
        <span className="text-[10px] font-semibold text-line/50">
          {m.status === "live" ? "Đang đấu" : m.status === "done" ? "Đã xong" : "Chờ"}
        </span>
      </div>

      <div className="mt-1.5 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className={aWin ? "truncate text-sm font-bold" : "truncate text-sm text-line/70"}>
            {nameA}
          </span>
          <ScoreBox value={m.scoreA} onCommit={(v) => onScore("scoreA", v)} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={bWin ? "truncate text-sm font-bold" : "truncate text-sm text-line/70"}>
            {nameB}
          </span>
          <ScoreBox value={m.scoreB} onCommit={(v) => onScore("scoreB", v)} />
        </div>
      </div>

      {compact ? null : (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <select
            className="rounded-md bg-card px-1.5 py-1 text-[11px] font-semibold ring-1 ring-line/20"
            value={m.court}
            onChange={(e) => onCourt(e.target.value)}
          >
            {courts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <input
            className="w-28 rounded-md bg-card px-1.5 py-1 text-[11px] ring-1 ring-line/20 outline-none"
            placeholder="Trọng tài"
            value={m.referee}
            onChange={(e) => onReferee(e.target.value)}
          />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {m.status === "done" ? (
          <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={onReset}>
            ↺ Bắt đầu lại
          </button>
        ) : (
          <button
            className="btn-ghost !px-2 !py-1 text-[11px]"
            onClick={() => onStatus(m.status === "live" ? "pending" : "live")}
          >
            {m.status === "live" ? "Tạm dừng" : "Bắt đầu"}
          </button>
        )}
        <Link
          to="/cham-diem/$matchId"
          params={{ matchId: m.id }}
          className="btn-accent !px-2 !py-1 text-[11px]"
        >
          Chấm điểm
        </Link>
      </div>
    </div>
  );
}

/* ---------------- Trang ---------------- */

function ManagePage() {
  const { state, update, updateEvent, updateMatch } = useTournament();
  const [activeId, setActiveId] = useState(state.events[0]?.id ?? "");
  const [tab, setTab] = useState<"group" | "timeline" | "ko">("group");
  const [note, setNote] = useState("");
  const [dragMatch, setDragMatch] = useState<string | null>(null);
  const [dragEntry, setDragEntry] = useState<string | null>(null);

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
        <h1 className="font-head text-4xl font-bold uppercase tracking-tight">Quản lý giải đấu</h1>
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

  const setScore = (m: Match, key: "scoreA" | "scoreB", v: number | null) => {
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

  const resetMatch = (m: Match) => {
    const patched: Match[] = state.matches.map((x) => {
      if (x.id !== m.id) return x;
      const { live: _live, ...rest } = x;
      return { ...rest, scoreA: null, scoreB: null, status: "pending" as const };
    });
    update({ matches: propagateKnockout(patched, ev.id) });
  };

  const cardProps = (m: Match, compact?: boolean): CardProps => ({
    m,
    nameA: nameOf(m.aId),
    nameB: nameOf(m.bId),
    onScore: (k, v) => setScore(m, k, v),
    onStatus: (s) => updateMatch(m.id, { status: s }),
    onReset: () => resetMatch(m),
    courts: state.courts,
    onCourt: (c) => updateMatch(m.id, { court: c }),
    onReferee: (r) => updateMatch(m.id, { referee: r }),
    compact,
  });

  /* -------- Vòng bảng theo cột vòng -------- */
  const rounds = [...new Set(groupMatches.map((m) => m.round))].sort((a, b) => a - b);

  /* -------- Timeline -------- */
  const timelineSource = tab === "timeline" ? matches : [];
  const grid = buildTimeline(timelineSource, state.courts);
  const maxSlot = Math.max(
    2,
    ...[...grid.values()].flatMap((list) => list.map((s) => s.slot + 1)),
  );
  const slotIdxs = Array.from({ length: maxSlot + 1 }, (_, i) => i);

  const dropOn = (court: string, slot: number) => {
    if (!dragMatch) return;
    updateMatch(dragMatch, { court, timeSlot: slot });
    setDragMatch(null);
  };

  /* -------- Nhánh loại trực tiếp -------- */
  const koRounds = [...new Set(koMatches.filter((m) => m.slot !== 99).map((m) => m.round))].sort(
    (a, b) => a - b,
  );
  const thirdMatch = koMatches.find((m) => m.slot === 99);

  const dropTeam = (m: Match, side: "aId" | "bId") => {
    if (!dragEntry) return;
    updateMatch(m.id, { [side]: dragEntry } as Partial<Match>);
    setDragEntry(null);
  };

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button
      className={
        tab === id
          ? "rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
          : "rounded-lg bg-card px-3 py-2 text-sm font-semibold text-line/70 ring-1 ring-line/20"
      }
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h1 className="font-head text-4xl font-bold uppercase tracking-tight">Quản lý giải đấu</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {state.events.map((e) => (
          <button
            key={e.id}
            onClick={() => setActiveId(e.id)}
            className={
              e.id === ev.id
                ? "rounded-lg bg-line px-3 py-2 text-sm font-semibold text-paper"
                : "rounded-lg bg-card px-3 py-2 text-sm font-semibold text-line/70 ring-1 ring-line/20"
            }
          >
            {e.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TabBtn id="group" label="Vòng bảng" />
        <TabBtn id="timeline" label="Timeline sân" />
        <TabBtn id="ko" label="Loại trực tiếp" />
        <span className="mx-1 h-5 w-px bg-line/15" />
        {tab === "ko" ? (
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
        ) : tab === "timeline" ? (
          <>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-line/70">
              Giờ bắt đầu
              <input
                type="time"
                className="field w-32"
                value={state.startTime}
                onChange={(e) => update({ startTime: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-line/70">
              Phút / trận
              <input
                type="number"
                min={10}
                max={120}
                step={5}
                className="field w-20 text-center"
                value={state.slotMinutes}
                onChange={(e) =>
                  update({ slotMinutes: Math.max(5, Number(e.target.value) || 30) })
                }
              />
            </label>
          </>
        ) : (
          <button className="btn-accent" onClick={buildGroups}>
            Tạo lịch vòng bảng
          </button>
        )}
        {note ? <span className="text-xs font-medium text-court">{note}</span> : null}
      </div>

      {/* ---------- Vòng bảng ---------- */}
      {tab === "group" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {rounds.length === 0 ? (
              <p className="panel p-4 text-sm text-line/50">
                Chưa có lịch. Bấm “Tạo lịch vòng bảng”.
              </p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {rounds.map((r) => (
                  <div key={r} className="w-[260px] shrink-0">
                    <div className="rounded-lg bg-accent/15 py-2 text-center font-head text-sm font-bold uppercase tracking-wide text-accent ring-1 ring-accent/30">
                      Vòng {r}
                    </div>
                    <div className="mt-3 space-y-3">
                      {groupMatches
                        .filter((m) => m.round === r)
                        .sort((a, b) => a.groupName.localeCompare(b.groupName))
                        .map((m) => (
                          <MatchCard key={m.id} {...cardProps(m)} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <p className="eyebrow">Bảng xếp hạng</p>
            {(ev.groups.length
              ? ev.groups
              : [{ name: "Vòng tròn", entryIds: entries.map((e) => e.id) }]
            ).map((g) => {
              const rows = computeStandings(
                g.entryIds,
                groupMatches.filter((m) => m.groupName === g.name),
                ev,
              );
              const c = groupColor(g.name);
              return (
                <div key={g.name} className="panel mt-3 overflow-hidden">
                  <p
                    className="px-3 py-2 font-head text-sm font-bold uppercase tracking-wide"
                    style={{ backgroundColor: c.bg, color: c.text }}
                  >
                    {g.name}
                  </p>
                  <table className="w-full text-sm">
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
      ) : null}

      {/* ---------- Timeline ---------- */}
      {tab === "timeline" ? (
        <div className="mt-6">
          <p className="text-xs text-line/60">
            Kéo thả thẻ trận sang khung giờ hoặc sân khác để sắp lịch.
          </p>
          <div className="panel mt-3 overflow-x-auto">
            <div
              className="min-w-[900px]"
              style={{
                display: "grid",
                gridTemplateColumns: `120px repeat(${slotIdxs.length}, minmax(200px, 1fr))`,
              }}
            >
              <div className="border-b border-line/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-line/50">
                Sân / Giờ
              </div>
              {slotIdxs.map((s) => (
                <div
                  key={`h${s}`}
                  className="border-b border-l border-line/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-line/60"
                >
                  {addMinutes(state.startTime, s * state.slotMinutes)}
                </div>
              ))}

              {state.courts.map((court) => (
                <div key={court} className="contents">
                  <div className="border-b border-line/10 px-3 py-3 text-sm font-semibold">
                    {court}
                  </div>
                  {slotIdxs.map((s) => {
                    const cell = (grid.get(court) ?? []).filter((x) => x.slot === s);
                    return (
                      <div
                        key={`${court}-${s}`}
                        className="min-h-[104px] border-b border-l border-line/10 p-1.5"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dropOn(court, s)}
                      >
                        {cell.map(({ match: m }) => (
                          <div
                            key={m.id}
                            draggable
                            onDragStart={() => setDragMatch(m.id)}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <MatchCard {...cardProps(m, true)} />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- Loại trực tiếp ---------- */}
      {tab === "ko" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-9 overflow-x-auto">
            {koRounds.length === 0 ? (
              <p className="panel p-4 text-sm text-line/50">
                Chưa có nhánh. Bấm “Tạo nhánh loại trực tiếp”.
              </p>
            ) : (
              <div className="flex min-w-max gap-6">
                {koRounds.map((r) => {
                  const list = koMatches
                    .filter((m) => m.round === r && m.slot !== 99)
                    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
                  return (
                    <div key={r} className="w-[250px] shrink-0">
                      <div className="rounded-lg bg-accent/15 py-2 text-center font-head text-sm font-bold uppercase tracking-wide text-accent ring-1 ring-accent/30">
                        {list[0]?.koRound ?? `Vòng ${r}`}
                      </div>
                      <div className="mt-3 flex h-full flex-col justify-around gap-4">
                        {list.map((m) => (
                          <KoCard
                            key={m.id}
                            m={m}
                            nameA={nameOf(m.aId)}
                            nameB={nameOf(m.bId)}
                            onScore={(k, v) => setScore(m, k, v)}
                            onReset={() => resetMatch(m)}
                            onDropTeam={(side) => dropTeam(m, side)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {thirdMatch ? (
              <div className="mt-6 w-[250px]">
                <div className="rounded-lg bg-court/15 py-2 text-center font-head text-sm font-bold uppercase tracking-wide text-courtdeep ring-1 ring-court/30">
                  Tranh hạng 3
                </div>
                <div className="mt-3">
                  <KoCard
                    m={thirdMatch}
                    nameA={nameOf(thirdMatch.aId)}
                    nameB={nameOf(thirdMatch.bId)}
                    onScore={(k, v) => setScore(thirdMatch, k, v)}
                    onReset={() => resetMatch(thirdMatch)}
                    onDropTeam={(side) => dropTeam(thirdMatch, side)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-3">
            <p className="eyebrow">Xếp thủ công</p>
            <p className="mt-2 text-xs text-line/60">
              Kéo tên đội bên dưới thả vào ô trong nhánh để tự chọn cặp đấu.
            </p>
            <div className="panel mt-3 max-h-[420px] space-y-1.5 overflow-auto p-2">
              {entries.map((e: Entry) => (
                <div
                  key={e.id}
                  draggable
                  onDragStart={() => setDragEntry(e.id)}
                  className="cursor-grab truncate rounded-md bg-secondary px-2 py-1.5 text-sm font-medium active:cursor-grabbing"
                >
                  {entryName(e)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KoCard({
  m,
  nameA,
  nameB,
  onScore,
  onReset,
  onDropTeam,
}: {
  m: Match;
  nameA: string;
  nameB: string;
  onScore: (k: "scoreA" | "scoreB", v: number | null) => void;
  onReset: () => void;
  onDropTeam: (side: "aId" | "bId") => void;
}) {
  const aWin = m.scoreA !== null && m.scoreB !== null && m.scoreA > m.scoreB;
  const bWin = m.scoreA !== null && m.scoreB !== null && m.scoreB > m.scoreA;
  const row = (win: boolean) =>
    win ? "flex items-center justify-between gap-2 px-2.5 py-2 font-bold" : "flex items-center justify-between gap-2 px-2.5 py-2 text-line/60";
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-line/20">
      <div
        className={row(aWin)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDropTeam("aId")}
      >
        <span className="truncate text-sm">{nameA}</span>
        <ScoreBox value={m.scoreA} onCommit={(v) => onScore("scoreA", v)} />
      </div>
      <div className="h-px bg-line/10" />
      <div
        className={row(bWin)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDropTeam("bId")}
      >
        <span className="truncate text-sm">{nameB}</span>
        <ScoreBox value={m.scoreB} onCommit={(v) => onScore("scoreB", v)} />
      </div>
      <div className="flex items-center gap-1.5 bg-secondary/60 px-2 py-1.5">
        {m.status === "done" ? (
          <button className="btn-ghost !px-2 !py-1 text-[11px]" onClick={onReset}>
            ↺ Bắt đầu lại
          </button>
        ) : null}
        <Link
          to="/cham-diem/$matchId"
          params={{ matchId: m.id }}
          className="btn-accent !px-2 !py-1 text-[11px]"
        >
          Chấm điểm
        </Link>
      </div>
    </div>
  );
}
