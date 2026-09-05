import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  drawPairs,
  entryName,
  splitGroups,
  uid,
  useTournament,
  type Entry,
  type TEvent,
} from "@/lib/tournament-store";

export const Route = createFileRoute("/van-dong-vien")({
  head: () => ({
    meta: [
      { title: "Danh sách vận động viên — Nảy Court" },
      {
        name: "description",
        content:
          "Nhập tay hoặc import Excel/CSV danh sách VĐV cho từng nội dung, ghi điểm trình, đánh dấu đã đóng lệ phí và chia bảng tự động hoặc thủ công.",
      },
      { property: "og:title", content: "Danh sách vận động viên — Nảy Court" },
      {
        property: "og:description",
        content: "Nhập VĐV, điểm trình, lệ phí và chia bảng A B C D dễ nhìn.",
      },
    ],
  }),
  component: PlayersPage,
});

function parseCsv(text: string): Array<string[]> {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[,;\t]/).map((c) => c.trim()));
}

function PlayersPage() {
  const { state, update, updateEvent } = useTournament();
  const [activeId, setActiveId] = useState<string>(state.events[0]?.id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");

  const ev: TEvent | undefined = state.events.find((e) => e.id === activeId) ?? state.events[0];
  const entries = useMemo(
    () => state.entries.filter((e) => ev && e.eventId === ev.id),
    [state.entries, ev],
  );

  if (!ev) {
    return (
      <div className="max-w-xl">
        <h1 className="font-head text-4xl font-black uppercase tracking-tighter">Danh sách VĐV</h1>
        <p className="mt-3 text-sm text-line/60">
          Chưa có nội dung nào. Hãy tạo nội dung thi đấu trước.
        </p>
        <Link to="/noi-dung" className="btn-accent mt-4">
          Tạo nội dung
        </Link>
      </div>
    );
  }

  const slots = ev.mode === "don" ? 1 : ev.pairMode === "fixed" ? 2 : 1;

  const setEntries = (next: Entry[]) =>
    update({ entries: [...state.entries.filter((e) => e.eventId !== ev.id), ...next] });

  const addEntry = () =>
    setEntries([
      ...entries,
      {
        id: uid(),
        eventId: ev.id,
        players: Array.from({ length: slots }, () => ({ name: "", rating: null })),
        paid: false,
      },
    ]);

  const patchEntry = (id: string, patch: Partial<Entry>) =>
    setEntries(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const patchPlayer = (id: string, idx: number, patch: Partial<Entry["players"][number]>) =>
    setEntries(
      entries.map((e) =>
        e.id === id
          ? {
              ...e,
              players: e.players.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
            }
          : e,
      ),
    );

  const removeEntry = (id: string) => setEntries(entries.filter((e) => e.id !== id));

  const onImport = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    const imported: Entry[] = [];
    rows.forEach((cols, i) => {
      if (i === 0 && /t[eê]n|name/i.test(cols[0] ?? "")) return;
      const players: Entry["players"] = [];
      if (slots === 2) {
        players.push({ name: cols[0] ?? "", rating: num(cols[1]) });
        players.push({ name: cols[2] ?? "", rating: num(cols[3]) });
      } else {
        players.push({ name: cols[0] ?? "", rating: num(cols[1]) });
      }
      if (players.some((p) => p.name)) {
        imported.push({ id: uid(), eventId: ev.id, players, paid: false });
      }
    });
    setEntries([...entries, ...imported]);
    setNote(`Đã import ${imported.length} dòng.`);
  };

  const doDraw = () => {
    if (entries.some((e) => e.players.some((p) => p.name.trim() && p.rating === null))) {
      setNote("Bốc thăm ngẫu nhiên cần điểm trình cho tất cả VĐV.");
      return;
    }
    const paired = drawPairs(entries, ev.id);
    setEntries(paired);
    setNote(`Đã bốc thăm ${paired.length} đội.`);
  };

  const autoGroups = () => {
    updateEvent(ev.id, { groups: splitGroups(entries, ev.groupCount) });
    setNote(`Đã chia ${ev.groupCount} bảng.`);
  };

  const moveEntry = (entryId: string, toGroup: number) => {
    const groups = ev.groups.map((g) => ({
      ...g,
      entryIds: g.entryIds.filter((id) => id !== entryId),
    }));
    groups[toGroup]?.entryIds.push(entryId);
    updateEvent(ev.id, { groups });
  };

  return (
    <div>
      <h1 className="text-balance font-head text-4xl font-black uppercase leading-none tracking-tighter">
        Danh sách VĐV
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

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-accent" onClick={addEntry}>
              + Thêm {ev.mode === "don" ? "VĐV" : slots === 2 ? "đội" : "VĐV"}
            </button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              Import Excel/CSV
            </button>
            {ev.mode === "doi" && ev.pairMode === "random" ? (
              <button className="btn-ghost" onClick={doDraw}>
                Bốc thăm ghép đôi
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = "";
              }}
            />
          </div>
          {note ? <p className="mt-2 text-xs font-medium text-court">{note}</p> : null}

          <div className="panel mt-4 divide-y divide-line/10 overflow-hidden">
            {entries.length === 0 ? (
              <p className="px-3.5 py-4 text-sm text-line/50">
                Chưa có VĐV. Thêm tay hoặc import file CSV (cột: Tên, Điểm trình
                {slots === 2 ? ", Tên 2, Điểm trình 2" : ""}).
              </p>
            ) : (
              entries.map((en, i) => (
                <div key={en.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <span className="w-5 font-head font-bold text-line/40">{i + 1}</span>
                  <div className="flex min-w-[220px] flex-1 flex-wrap gap-2">
                    {en.players.map((p, pi) => (
                      <div key={pi} className="flex min-w-[180px] flex-1 gap-2">
                        <input
                          className="field"
                          placeholder={slots === 2 ? `VĐV ${pi + 1}` : "Tên VĐV"}
                          value={p.name}
                          onChange={(e) => patchPlayer(en.id, pi, { name: e.target.value })}
                        />
                        <input
                          className="field w-20 shrink-0 text-center"
                          placeholder="—"
                          inputMode="decimal"
                          value={p.rating ?? ""}
                          onChange={(e) =>
                            patchPlayer(en.id, pi, { rating: num(e.target.value) })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-line/70">
                    <input
                      type="checkbox"
                      className="size-4 accent-[oklch(0.615_0.145_154.2)]"
                      checked={en.paid}
                      onChange={(e) => patchEntry(en.id, { paid: e.target.checked })}
                    />
                    Đã đóng phí
                  </label>
                  <button
                    className="text-line/40 hover:text-destructive"
                    onClick={() => removeEntry(en.id)}
                    aria-label="Xoá"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="eyebrow">Chia bảng</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-line/70">
                Số bảng
              </span>
              <input
                type="number"
                min={1}
                max={8}
                className="field mt-1.5 w-24"
                value={ev.groupCount}
                onChange={(e) =>
                  updateEvent(ev.id, {
                    groupCount: Math.max(1, Math.min(8, Number(e.target.value) || 1)),
                  })
                }
              />
            </div>
            <button className="btn-accent" onClick={autoGroups}>
              Chia bảng tự động
            </button>
            <button
              className="btn-ghost"
              onClick={() =>
                updateEvent(ev.id, {
                  groups: Array.from({ length: ev.groupCount }, (_, i) => ({
                    name: `Bảng ${"ABCDEFGH"[i]}`,
                    entryIds: [],
                  })),
                })
              }
            >
              Xếp thủ công
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ev.groups.map((g, gi) => (
              <div key={g.name} className="panel p-3">
                <p className="font-head text-lg font-black uppercase tracking-tight">{g.name}</p>
                <div className="mt-2 space-y-1.5">
                  {g.entryIds.length === 0 ? (
                    <p className="text-xs text-line/40">Trống</p>
                  ) : (
                    g.entryIds.map((id) => (
                      <div key={id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">
                          {entryName(entries.find((e) => e.id === id))}
                        </span>
                        <select
                          className="rounded-md bg-white/70 px-1.5 py-1 text-xs ring-1 ring-black/5"
                          value={gi}
                          onChange={(e) => moveEntry(id, Number(e.target.value))}
                        >
                          {ev.groups.map((gg, i) => (
                            <option key={gg.name} value={i}>
                              {gg.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {ev.groups.length > 0 &&
          entries.some((e) => !ev.groups.some((g) => g.entryIds.includes(e.id))) ? (
            <div className="panel mt-3 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-line/70">
                Chưa xếp bảng
              </p>
              <div className="mt-2 space-y-1.5">
                {entries
                  .filter((e) => !ev.groups.some((g) => g.entryIds.includes(e.id)))
                  .map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{entryName(e)}</span>
                      <select
                        className="rounded-md bg-white/70 px-1.5 py-1 text-xs ring-1 ring-black/5"
                        value=""
                        onChange={(x) => moveEntry(e.id, Number(x.target.value))}
                      >
                        <option value="">Chọn bảng</option>
                        {ev.groups.map((gg, i) => (
                          <option key={gg.name} value={i}>
                            {gg.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          <Link to="/quan-ly-giai" className="btn-accent mt-4">
            Tiếp tục — Quản lý giải đấu
          </Link>
        </div>
      </div>
    </div>
  );
}

function num(v: string | undefined): number | null {
  if (!v || !v.trim()) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
