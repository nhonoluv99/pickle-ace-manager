import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  entryName,
  propagateKnockout,
  useTournament,
  type LiveState,
  type Match,
} from "@/lib/tournament-store";

export const Route = createFileRoute("/cham-diem/$matchId")({
  head: () => ({
    meta: [
      { title: "Chấm điểm trực tiếp — Nảy Court" },
      {
        name: "description",
        content:
          "Màn hình trọng tài chấm điểm trực tiếp trận Pickleball: chọn kiểu tính điểm, điểm thắng, hội ý, người giao bóng và ghi điểm bằng một chạm.",
      },
      { property: "og:title", content: "Chấm điểm trực tiếp — Nảy Court" },
      {
        property: "og:description",
        content: "Ghi điểm rally hoặc side-out, hoàn tác và kết thúc trận trong một màn hình.",
      },
    ],
  }),
  component: LiveScoringPage,
});

const defaultLive = (): LiveState => ({
  scoring: "sideout",
  target: 11,
  winBy2: true,
  timeoutSeconds: 60,
  medicalSeconds: 900,
  timeoutsPerTeam: 1,
  serveTeam: 0,
  serverNum: 2,
  serverIdx: 0,
  receiverIdx: 0,
  a: 0,
  b: 0,
  toUsed: [0, 0],
  medUsed: [0, 0],
  history: [],
  note: "",
});

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-court/15 px-4 py-3 text-sm font-semibold text-courtdeep ring-2 ring-court/60"
          : "rounded-lg bg-white/80 px-4 py-3 text-sm font-semibold text-line/70 ring-1 ring-black/10"
      }
    >
      {children}
    </button>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-line/60">{children}</p>
);

function LiveScoringPage() {
  const { matchId } = Route.useParams();
  const { state, update, updateMatch } = useTournament();
  const navigate = useNavigate();
  const match = state.matches.find((m) => m.id === matchId);
  const [started, setStarted] = useState(match?.status === "live" && !!match.live);
  const [tossing, setTossing] = useState(false);
  const [tossFlash, setTossFlash] = useState<0 | 1>(0);
  const [tossed, setTossed] = useState(match?.status === "live" && !!match.live);
  const [timer, setTimer] = useState<{ label: string; left: number } | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [changeover, setChangeover] = useState(false);
  const [coDone, setCoDone] = useState(false);
  const [endAsk, setEndAsk] = useState(false);
  const endDismissed = useRef(false);

  useEffect(() => {
    if (!timer) return;
    if (timer.left <= 0) return;
    const id = setTimeout(() => setTimer({ ...timer, left: timer.left - 1 }), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  if (!match) {
    return (
      <div className="p-8">
        <p className="text-sm text-line/60">Không tìm thấy trận đấu.</p>
        <Link to="/quan-ly-giai" className="btn-accent mt-4">
          Về quản lý giải
        </Link>
      </div>
    );
  }

  const teamA = state.entries.find((e) => e.id === match.aId);
  const teamB = state.entries.find((e) => e.id === match.bId);
  const namesA = teamA?.players.map((p) => p.name || "VĐV") ?? ["Đội A"];
  const namesB = teamB?.players.map((p) => p.name || "VĐV") ?? ["Đội B"];
  const live = match.live ?? defaultLive();

  const setLive = (patch: Partial<LiveState>) =>
    updateMatch(match.id, { live: { ...live, ...patch } });

  const finish = (m: Match, a: number, b: number) => {
    const patched = state.matches.map((x) =>
      x.id === m.id ? { ...x, scoreA: a, scoreB: b, status: "done" as const } : x,
    );
    update({ matches: propagateKnockout(patched, m.eventId) });
    void navigate({ to: "/quan-ly-giai" });
  };

  /* ---------- Màn hình cài đặt ---------- */
  if (!started) {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-line/60">
          Chấm điểm trực tiếp
        </p>
        <h1 className="mt-1 font-head text-2xl font-bold uppercase tracking-tight">
          {entryName(teamA)} <span className="text-line/40">vs</span> {entryName(teamB)}
        </h1>

        <Lbl>Kiểu tính điểm</Lbl>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["rally", "sideout", "manual"] as const).map((s) => (
            <Chip key={s} active={live.scoring === s} onClick={() => setLive({ scoring: s })}>
              {s === "rally" ? "Rally" : s === "sideout" ? "Side-out" : "Thủ công"}
            </Chip>
          ))}
        </div>

        <Lbl>Điểm thắng</Lbl>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[11, 15, 21].map((t) => (
            <Chip key={t} active={live.target === t} onClick={() => setLive({ target: t })}>
              {t}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-line/60">Hoặc nhập điểm khác</span>
          <input
            type="number"
            className="field w-24 text-center font-bold"
            value={live.target}
            onChange={(e) => setLive({ target: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>

        <Lbl>Hội ý / đội</Lbl>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((t) => (
            <Chip
              key={t}
              active={live.timeoutsPerTeam === t}
              onClick={() => setLive({ timeoutsPerTeam: t })}
            >
              {t}
            </Chip>
          ))}
        </div>

        <Lbl>Cách biệt 2 điểm?</Lbl>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Chip active={live.winBy2} onClick={() => setLive({ winBy2: true })}>
            Có — phải cách 2
          </Chip>
          <Chip active={!live.winBy2} onClick={() => setLive({ winBy2: false })}>
            Không — chạm là thắng
          </Chip>
        </div>

        <Lbl>Thời gian hội ý / y tế</Lbl>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-line/20">
            Hội ý (giây)
            <input
              type="number"
              className="w-20 rounded-md bg-secondary px-2 py-1 text-center font-bold outline-none"
              value={live.timeoutSeconds}
              onChange={(e) => setLive({ timeoutSeconds: Math.max(5, Number(e.target.value) || 60) })}
            />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-line/20">
            Y tế (phút)
            <input
              type="number"
              className="w-20 rounded-md bg-secondary px-2 py-1 text-center font-bold outline-none"
              value={Math.round(live.medicalSeconds / 60)}
              onChange={(e) =>
                setLive({ medicalSeconds: Math.max(1, Number(e.target.value) || 15) * 60 })
              }
            />
          </label>
        </div>

        <Lbl>Tung đồng xu chọn đội giao bóng</Lbl>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[entryName(teamA), entryName(teamB)].map((n, i) => {
            const highlight = tossing ? tossFlash === i : tossed && live.serveTeam === i;
            return (
              <div
                key={n + i}
                className={
                  highlight
                    ? "rounded-lg bg-accent/20 px-4 py-4 text-center font-head text-sm font-bold ring-2 ring-accent"
                    : "rounded-lg bg-card px-4 py-4 text-center font-head text-sm font-bold text-line/50 ring-1 ring-line/20"
                }
              >
                {n}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center">
          <button
            className="btn-accent"
            disabled={tossing}
            onClick={() => {
              setTossing(true);
              setTossed(false);
              let n = 0;
              const tick = () => {
                setTossFlash((f) => (f === 0 ? 1 : 0));
                n += 1;
                if (n < 18) setTimeout(tick, 60 + n * 8);
                else {
                  const r: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
                  setTossFlash(r);
                  setLive({ serveTeam: r });
                  setTossing(false);
                  setTossed(true);
                }
              };
              tick();
            }}
          >
            🎲 {tossing ? "Đang tung..." : "Tung đồng xu"}
          </button>
        </div>

        {tossed ? (
        <>
        <Lbl>Ai giao bóng trước?</Lbl>
        <p className="text-center text-xs text-line/50">
          {live.serveTeam === 0 ? entryName(teamA) : entryName(teamB)}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(live.serveTeam === 0 ? namesA : namesB).map((n, i) => (
            <Chip key={n + i} active={live.serverIdx === i} onClick={() => setLive({ serverIdx: i })}>
              {n}
            </Chip>
          ))}
        </div>

        <Lbl>Ai nhận giao trước?</Lbl>
        <p className="text-center text-xs text-line/50">
          {live.serveTeam === 0 ? entryName(teamB) : entryName(teamA)}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(live.serveTeam === 0 ? namesB : namesA).map((n, i) => (
            <Chip
              key={n + i}
              active={live.receiverIdx === i}
              onClick={() => setLive({ receiverIdx: i })}
            >
              {n}
            </Chip>
          ))}
        </div>

        </>
        ) : (
          <p className="mt-4 text-center text-xs text-line/50">
            Tung đồng xu để chọn đội giao bóng, sau đó chọn người giao và người nhận.
          </p>
        )}

        <button
          disabled={!tossed}
          className="mt-6 w-full rounded-lg bg-courtdeep py-4 disabled:opacity-40 font-head text-lg font-bold uppercase tracking-wide text-paper"
          onClick={() => {
            updateMatch(match.id, {
              status: "live",
              live: { ...live, a: 0, b: 0, history: [] },
            });
            setStarted(true);
          }}
        >
          Bắt đầu
        </button>
        <Link to="/quan-ly-giai" className="btn-ghost mt-3 w-full">
          Quay lại
        </Link>
      </div>
    );
  }

  /* ---------- Màn hình chấm điểm ---------- */
  const serverName = (live.serveTeam === 0 ? namesA : namesB)[live.serverIdx] ?? "—";
  const receiverName = (live.serveTeam === 0 ? namesB : namesA)[live.receiverIdx] ?? "—";
  const doubles = namesA.length > 1;
  const isSideout = live.scoring === "sideout";
  const winner =
    Math.max(live.a, live.b) >= live.target &&
    (!live.winBy2 || Math.abs(live.a - live.b) >= 2)
      ? live.a > live.b
        ? entryName(teamA)
        : entryName(teamB)
      : null;

  const push = (patch: Partial<LiveState>) =>
    setLive({
      ...patch,
      history: [
        ...live.history,
        {
          a: live.a,
          b: live.b,
          serveTeam: live.serveTeam,
          serverNum: live.serverNum,
          serverIdx: live.serverIdx,
        },
      ],
    });

  const coPoint = live.target === 11 ? 6 : live.target === 15 ? 8 : Math.ceil(live.target / 2);

  const afterScore = (na: number, nb: number) => {
    if (!coDone && (na === coPoint || nb === coPoint)) {
      setCoDone(true);
      setChangeover(true);
    }
    const win =
      Math.max(na, nb) >= live.target && (!live.winBy2 || Math.abs(na - nb) >= 2);
    if (win && !endDismissed.current) setEndAsk(true);
  };

  const pointFor = (team: 0 | 1) => {
    const na = team === 0 ? live.a + 1 : live.a;
    const nb = team === 1 ? live.b + 1 : live.b;
    push(team === 0 ? { a: na } : { b: nb });
    afterScore(na, nb);
  };

  const scoreForServing = () => {
    const na = live.serveTeam === 0 ? live.a + 1 : live.a;
    const nb = live.serveTeam === 1 ? live.b + 1 : live.b;
    push({
      ...(live.serveTeam === 0 ? { a: na } : { b: nb }),
      serverIdx: doubles ? 1 - live.serverIdx : live.serverIdx,
    });
    afterScore(na, nb);
  };

  const startTimer = (label: string, secs: number) => setTimer({ label, left: secs });
  const mmss = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

  const sideOut = () => {
    if (doubles && live.serverNum === 1) {
      push({ serverNum: 2, serverIdx: 1 - live.serverIdx });
    } else {
      push({
        serveTeam: (1 - live.serveTeam) as 0 | 1,
        serverNum: 1,
        serverIdx: 0,
      });
    }
  };

  const undo = () => {
    const last = live.history[live.history.length - 1];
    if (!last) return;
    setLive({ ...last, history: live.history.slice(0, -1) });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper text-ink">
      <div className="flex items-center justify-between border-b border-line/10 px-4 py-3">
        <Link to="/quan-ly-giai" className="btn-ghost !px-2.5 !py-1.5 text-xs">
          ← Chấm điểm trực tiếp
        </Link>
        <span className="text-xs font-semibold text-line/50">
          {match.court} {match.referee ? `· TT ${match.referee}` : ""}
        </span>
      </div>

      <div className="bg-line/5 py-4 text-center">
        <p className="font-head text-5xl font-bold tracking-tight">
          {live.serveTeam === 0 ? live.a : live.b}-{live.serveTeam === 0 ? live.b : live.a}
          {isSideout && doubles ? `-${live.serverNum}` : ""}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-courtdeep">
          Giao: {serverName} · Nhận: {receiverName}
        </p>
        <p className="mt-1 text-sm font-medium text-line/70">
          {entryName(teamA)} {live.a} · {entryName(teamB)} {live.b}
        </p>
      </div>

      <div className="grid flex-1 grid-cols-2">
        <button
          className="flex flex-col items-center justify-center bg-court/12 transition hover:bg-court/20"
          onClick={() => (isSideout ? scoreForServing() : pointFor(0))}
        >
          <span className="font-head text-5xl font-bold uppercase tracking-tight text-courtdeep">
            Điểm
          </span>
          <span className="mt-2 text-xs text-line/60">
            cho {isSideout ? (live.serveTeam === 0 ? entryName(teamA) : entryName(teamB)) : entryName(teamA)}
          </span>
        </button>
        <button
          className="flex flex-col items-center justify-center bg-white/60 transition hover:bg-white"
          onClick={() => (isSideout ? sideOut() : pointFor(1))}
        >
          <span className="font-head text-5xl font-bold uppercase tracking-tight">
            {isSideout ? "Mất giao" : "Điểm"}
          </span>
          <span className="mt-2 text-xs text-line/60">
            {isSideout ? "side out" : `cho ${entryName(teamB)}`}
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line/10 px-3 py-2 text-[11px] font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="max-w-[90px] truncate text-line/50">{entryName(teamA)}</span>
          <button
            className="rounded-md bg-card px-2 py-1 ring-1 ring-line/20"
            onClick={() => {
              setLive({ toUsed: [live.toUsed[0] + 1, live.toUsed[1]] });
              startTimer(`Hội ý · ${entryName(teamA)}`, live.timeoutSeconds);
            }}
          >
            ⏱ Hội ý {live.timeoutsPerTeam - live.toUsed[0]}
          </button>
          <button
            className="rounded-md bg-destructive px-2 py-1 text-destructive-foreground"
            onClick={() => {
              setLive({ medUsed: [live.medUsed[0] + 1, live.medUsed[1]] });
              startTimer(`Y tế · ${entryName(teamA)}`, live.medicalSeconds);
            }}
          >
            MED
          </button>
        </div>

        <button
          className="rounded-md bg-secondary px-2.5 py-1 ring-1 ring-line/20"
          onClick={() => setNoteOpen(true)}
        >
          📝 Note
        </button>

        <div className="flex items-center gap-1.5">
          <button
            className="rounded-md bg-destructive px-2 py-1 text-destructive-foreground"
            onClick={() => {
              setLive({ medUsed: [live.medUsed[0], live.medUsed[1] + 1] });
              startTimer(`Y tế · ${entryName(teamB)}`, live.medicalSeconds);
            }}
          >
            MED
          </button>
          <button
            className="rounded-md bg-card px-2 py-1 ring-1 ring-line/20"
            onClick={() => {
              setLive({ toUsed: [live.toUsed[0], live.toUsed[1] + 1] });
              startTimer(`Hội ý · ${entryName(teamB)}`, live.timeoutSeconds);
            }}
          >
            ⏱ Hội ý {live.timeoutsPerTeam - live.toUsed[1]}
          </button>
          <span className="max-w-[90px] truncate text-line/50">{entryName(teamB)}</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 border-t border-line/10 p-2">
        <button className="btn-ghost" onClick={undo}>
          ↺ Hoàn tác
        </button>
        <span className="self-center text-xs text-line/50">
          {winner ? `Thắng: ${winner}` : `tới ${live.target}`}
        </span>
        <button
          className="rounded-lg bg-courtdeep font-head text-base font-bold uppercase tracking-wide text-paper"
          onClick={() => finish(match, live.a, live.b)}
        >
          Kết thúc
        </button>
      </div>

      {timer ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/85 text-paper">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">{timer.label}</p>
          <p className="mt-3 font-head text-7xl font-bold tabular-nums">{mmss(timer.left)}</p>
          <button className="btn-accent mt-6" onClick={() => setTimer(null)}>
            {timer.left <= 0 ? "Tiếp tục thi đấu" : "Kết thúc sớm"}
          </button>
        </div>
      ) : null}

      {changeover ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/85 px-6 text-center text-paper">
          <p className="font-head text-3xl font-bold uppercase tracking-tight">Đổi sân</p>
          <p className="mt-2 text-sm opacity-80">
            Một đội đã đạt {coPoint} điểm — nhắc hai đội đổi sân.
          </p>
          <button className="btn-accent mt-6" onClick={() => setChangeover(false)}>
            Đã đổi sân
          </button>
        </div>
      ) : null}

      {endAsk ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-ink/90 px-6 text-center text-paper">
          <p className="font-head text-3xl font-bold uppercase tracking-tight">Kết thúc trận?</p>
          <p className="mt-2 text-sm opacity-80">
            {entryName(teamA)} {live.a} — {live.b} {entryName(teamB)}
          </p>
          <div className="mt-6 flex gap-2">
            <button
              className="btn-ghost"
              onClick={() => {
                endDismissed.current = true;
                setEndAsk(false);
              }}
            >
              Chơi tiếp
            </button>
            <button className="btn-accent" onClick={() => finish(match, live.a, live.b)}>
              Kết thúc trận
            </button>
          </div>
        </div>
      ) : null}

      {noteOpen ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/80 px-6">
          <div className="w-full max-w-md rounded-xl bg-card p-4">
            <p className="font-head text-lg font-bold uppercase tracking-tight">Ghi chú trọng tài</p>
            <textarea
              className="field mt-3 h-40 resize-none"
              placeholder="Ghi chú sự cố, chấn thương, khiếu nại..."
              value={live.note}
              onChange={(e) => setLive({ note: e.target.value })}
            />
            <button className="btn-accent mt-3 w-full" onClick={() => setNoteOpen(false)}>
              Xong
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
