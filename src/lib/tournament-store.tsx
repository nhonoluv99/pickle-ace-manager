import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ---------------- Kiểu dữ liệu ---------------- */

export type PlayerSlot = { name: string; rating: number | null };

/** Một "đội" đăng ký trong nội dung (đơn = 1 người, đôi = 2 người). */
export type Entry = {
  id: string;
  eventId: string;
  players: PlayerSlot[];
  paid: boolean;
};

export type Group = { name: string; entryIds: string[] };

export type MatchStatus = "pending" | "live" | "done";

export type LiveState = {
  scoring: "rally" | "sideout" | "manual";
  target: number;
  winBy2: boolean;
  timeoutSeconds: number;
  medicalSeconds: number;
  timeoutsPerTeam: number;
  serveTeam: 0 | 1;
  serverNum: 1 | 2;
  serverIdx: number;
  receiverIdx: number;
  a: number;
  b: number;
  toUsed: [number, number];
  medUsed: [number, number];
  history: Array<{ a: number; b: number; serveTeam: 0 | 1; serverNum: 1 | 2; serverIdx: number }>;
  note: string;
};

export type Match = {
  id: string;
  eventId: string;
  stage: "group" | "ko";
  groupName: string;
  round: number;
  koRound?: string;
  slot?: number;
  aId: string | null;
  bId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  court: string;
  referee: string;
  status: MatchStatus;
  live?: LiveState;
};

export type EventMode = "don" | "doi";
export type BracketType = "rr" | "rr_ko";
export type PairMode = "random" | "fixed";

export type TEvent = {
  id: string;
  name: string;
  mode: EventMode;
  bracket: BracketType;
  thirdPlace: boolean;
  pairMode: PairMode;
  winPoints: number;
  lossPoints: number;
  drawPoints: number;
  groupCount: number;
  advancePerGroup: number;
  groups: Group[];
};

export type TournamentState = {
  name: string;
  date: string;
  venue: string;
  venueName: string;
  /** Giờ bắt đầu ngày thi đấu, dạng HH:mm — dùng cho bảng timeline. */
  startTime: string;
  /** Số phút mỗi khung giờ trên timeline. */
  slotMinutes: number;
  courts: string[];
  events: TEvent[];
  entries: Entry[];
  matches: Match[];
};

const STORAGE_KEY = "nay-court-tournament-v3";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function makeEvent(name = "Nội dung mới"): TEvent {
  return {
    id: uid(),
    name,
    mode: "doi",
    bracket: "rr_ko",
    thirdPlace: false,
    pairMode: "random",
    winPoints: 2,
    lossPoints: 0,
    drawPoints: 1,
    groupCount: 2,
    advancePerGroup: 2,
    groups: [],
  };
}

const initialState: TournamentState = {
  name: "",
  date: "",
  venue: "",
  venueName: "",
  startTime: "08:00",
  slotMinutes: 30,
  courts: ["Sân 1", "Sân 2"],
  events: [],
  entries: [],
  matches: [],
};

type Ctx = {
  state: TournamentState;
  update: (patch: Partial<TournamentState>) => void;
  updateEvent: (id: string, patch: Partial<TEvent>) => void;
  updateMatch: (id: string, patch: Partial<Match>) => void;
  reset: () => void;
};

const TournamentContext = createContext<Ctx | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TournamentState>(initialState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as TournamentState) });
    } catch {
      /* ignore */
    }
  }, []);

  const commit = useCallback((next: TournamentState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next;
  }, []);

  const update = useCallback(
    (patch: Partial<TournamentState>) => setState((prev) => commit({ ...prev, ...patch })),
    [commit],
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<TEvent>) =>
      setState((prev) =>
        commit({ ...prev, events: prev.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
      ),
    [commit],
  );

  const updateMatch = useCallback(
    (id: string, patch: Partial<Match>) =>
      setState((prev) =>
        commit({
          ...prev,
          matches: prev.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }),
      ),
    [commit],
  );

  const reset = useCallback(() => {
    setState(initialState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ state, update, updateEvent, updateMatch, reset }),
    [state, update, updateEvent, updateMatch, reset],
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament phải nằm trong TournamentProvider");
  return ctx;
}

/* ---------------- Tiện ích ---------------- */

export function entryName(e: Entry | undefined | null): string {
  if (!e) return "—";
  const names = e.players.map((p) => p.name.trim()).filter(Boolean);
  return names.length ? names.join(" & ") : "Chưa đặt tên";
}

export function entryRating(e: Entry): number {
  const rs = e.players.map((p) => p.rating).filter((r): r is number => typeof r === "number");
  return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
}

const GROUP_LETTERS = "ABCDEFGH".split("");

/** Bốc thăm ngẫu nhiên ghép đôi cân bằng theo điểm trình (mạnh ghép yếu). */
export function drawPairs(entries: Entry[], eventId: string): Entry[] {
  const players = entries.flatMap((e) => e.players.filter((p) => p.name.trim()));
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const sorted = shuffled.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const out: Entry[] = [];
  let i = 0;
  let j = sorted.length - 1;
  while (i < j) {
    out.push({ id: uid(), eventId, players: [sorted[i]!, sorted[j]!], paid: false });
    i++;
    j--;
  }
  if (i === j) out.push({ id: uid(), eventId, players: [sorted[i]!], paid: false });
  return out;
}

/** Chia bảng rải đều theo điểm trình. */
export function splitGroups(entries: Entry[], groupCount: number): Group[] {
  const sorted = [...entries].sort((a, b) => entryRating(b) - entryRating(a));
  const n = Math.max(1, Math.min(groupCount, GROUP_LETTERS.length));
  const groups: Group[] = Array.from({ length: n }, (_, i) => ({
    name: `Bảng ${GROUP_LETTERS[i]}`,
    entryIds: [],
  }));
  sorted.forEach((t, i) => {
    const round = Math.floor(i / n);
    const pos = i % n;
    const idx = round % 2 === 0 ? pos : n - 1 - pos;
    groups[idx]!.entryIds.push(t.id);
  });
  return groups;
}

/** Lịch vòng tròn theo vòng (circle method) để không đội nào đấu 2 trận cùng lúc. */
function roundRobinRounds(ids: string[]): Array<Array<[string, string]>> {
  const list = [...ids];
  if (list.length < 2) return [];
  if (list.length % 2 === 1) list.push("__bye__");
  const n = list.length;
  const rounds: Array<Array<[string, string]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]!;
      const b = list[n - 1 - i]!;
      if (a !== "__bye__" && b !== "__bye__") pairs.push([a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

/** Sinh lịch vòng bảng cho một nội dung, phân sân theo số sân của giải. */
export function generateGroupMatches(ev: TEvent, entries: Entry[], courts: string[]): Match[] {
  const groups: Group[] =
    ev.groups.length > 0
      ? ev.groups
      : [{ name: "Vòng tròn", entryIds: entries.map((e) => e.id) }];

  const perGroupRounds = groups.map((g) => roundRobinRounds(g.entryIds));
  const maxRounds = Math.max(0, ...perGroupRounds.map((r) => r.length));
  const matches: Match[] = [];
  let courtCursor = 0;
  const courtList = courts.length ? courts : ["Sân 1"];

  for (let r = 0; r < maxRounds; r++) {
    perGroupRounds.forEach((rounds, gi) => {
      (rounds[r] ?? []).forEach(([a, b]) => {
        matches.push({
          id: uid(),
          eventId: ev.id,
          stage: "group",
          groupName: groups[gi]!.name,
          round: r + 1,
          aId: a,
          bId: b,
          scoreA: null,
          scoreB: null,
          court: courtList[courtCursor++ % courtList.length]!,
          referee: "",
          status: "pending",
        });
      });
    });
  }
  return matches;
}

export type StandingRow = {
  entryId: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number;
};

export function computeStandings(
  entryIds: string[],
  matches: Match[],
  ev: Pick<TEvent, "winPoints" | "lossPoints" | "drawPoints">,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  entryIds.forEach((id) =>
    rows.set(id, {
      entryId: id,
      played: 0,
      win: 0,
      draw: 0,
      loss: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      points: 0,
    }),
  );
  matches.forEach((m) => {
    if (m.scoreA === null || m.scoreB === null) return;
    const a = m.aId ? rows.get(m.aId) : null;
    const b = m.bId ? rows.get(m.bId) : null;
    if (!a || !b) return;
    a.played++;
    b.played++;
    a.pointsFor += m.scoreA;
    a.pointsAgainst += m.scoreB;
    b.pointsFor += m.scoreB;
    b.pointsAgainst += m.scoreA;
    if (m.scoreA > m.scoreB) {
      a.win++;
      b.loss++;
      a.points += ev.winPoints;
      b.points += ev.lossPoints;
    } else if (m.scoreB > m.scoreA) {
      b.win++;
      a.loss++;
      b.points += ev.winPoints;
      a.points += ev.lossPoints;
    } else {
      a.draw++;
      b.draw++;
      a.points += ev.drawPoints;
      b.points += ev.drawPoints;
    }
  });
  return [...rows.values()]
    .map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }))
    .sort((x, y) => y.points - x.points || y.diff - x.diff || y.pointsFor - x.pointsFor);
}

const KO_LABEL = (size: number) =>
  size === 2 ? "Chung kết" : size === 4 ? "Bán kết" : size === 8 ? "Tứ kết" : `Vòng ${size} đội`;

/**
 * Sinh nhánh loại trực tiếp từ kết quả vòng bảng.
 * Theo thông lệ pickleball: nhất bảng gặp nhì bảng khác (cross-bracket),
 * số đội đi tiếp mỗi bảng do người dùng chọn, thiếu suất thì lấy thành tích tốt nhất.
 */
export function generateKnockout(
  ev: TEvent,
  entries: Entry[],
  groupMatches: Match[],
  courts: string[],
): Match[] {
  const groups =
    ev.groups.length > 0
      ? ev.groups
      : [{ name: "Vòng tròn", entryIds: entries.map((e) => e.id) }];

  const byGroup = groups.map((g) => ({
    name: g.name,
    rows: computeStandings(
      g.entryIds,
      groupMatches.filter((m) => m.groupName === g.name),
      ev,
    ),
  }));

  const seeds: string[] = [];
  for (let pos = 0; pos < ev.advancePerGroup; pos++) {
    const layer = byGroup.map((g) => g.rows[pos]).filter(Boolean) as StandingRow[];
    layer.sort((a, b) => b.points - a.points || b.diff - a.diff || b.pointsFor - a.pointsFor);
    if (pos % 2 === 1) layer.reverse();
    layer.forEach((r) => seeds.push(r.entryId));
  }
  if (seeds.length < 2) return [];

  let size = 2;
  while (size < seeds.length) size *= 2;
  const slots: Array<string | null> = Array.from({ length: size }, (_, i) => seeds[i] ?? null);

  const courtList = courts.length ? courts : ["Sân 1"];
  const matches: Match[] = [];
  let courtCursor = 0;
  let roundIdx = 1;
  let current = size;

  while (current >= 2) {
    const label = KO_LABEL(current);
    for (let i = 0; i < current / 2; i++) {
      const isFirst = current === size;
      matches.push({
        id: uid(),
        eventId: ev.id,
        stage: "ko",
        groupName: label,
        round: roundIdx,
        koRound: label,
        slot: i,
        aId: isFirst ? (slots[i * 2] ?? null) : null,
        bId: isFirst ? (slots[i * 2 + 1] ?? null) : null,
        scoreA: null,
        scoreB: null,
        court: courtList[courtCursor++ % courtList.length]!,
        referee: "",
        status: "pending",
      });
    }
    roundIdx++;
    current /= 2;
  }

  if (ev.thirdPlace && size >= 4) {
    matches.push({
      id: uid(),
      eventId: ev.id,
      stage: "ko",
      groupName: "Tranh hạng 3",
      round: roundIdx - 1,
      koRound: "Tranh hạng 3",
      slot: 99,
      aId: null,
      bId: null,
      scoreA: null,
      scoreB: null,
      court: courtList[courtCursor++ % courtList.length]!,
      referee: "",
      status: "pending",
    });
  }

  return matches;
}

/** Đẩy đội thắng/thua sang vòng kế tiếp trong nhánh loại trực tiếp. */
export function propagateKnockout(matches: Match[], eventId: string): Match[] {
  const ko = matches.filter((m) => m.eventId === eventId && m.stage === "ko");
  const byRound = new Map<number, Match[]>();
  ko.forEach((m) => {
    if (m.slot === 99) return;
    const list = byRound.get(m.round) ?? [];
    list.push(m);
    byRound.set(m.round, list);
  });
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const next = new Map<string, Partial<Match>>();

  rounds.forEach((r, ri) => {
    const cur = (byRound.get(r) ?? []).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    const nxt = (byRound.get(rounds[ri + 1] ?? -1) ?? []).sort(
      (a, b) => (a.slot ?? 0) - (b.slot ?? 0),
    );
    cur.forEach((m, i) => {
      if (m.scoreA === null || m.scoreB === null) return;
      const winner = m.scoreA > m.scoreB ? m.aId : m.bId;
      const loser = m.scoreA > m.scoreB ? m.bId : m.aId;
      const target = nxt[Math.floor(i / 2)];
      if (target && winner) {
        const patch = next.get(target.id) ?? {};
        if (i % 2 === 0) patch.aId = winner;
        else patch.bId = winner;
        next.set(target.id, patch);
      }
      // Bán kết -> tranh hạng 3
      const semiRound = rounds[rounds.length - 2];
      if (r === semiRound && loser) {
        const third = ko.find((x) => x.slot === 99);
        if (third) {
          const patch = next.get(third.id) ?? {};
          if (i % 2 === 0) patch.aId = loser;
          else patch.bId = loser;
          next.set(third.id, patch);
        }
      }
    });
  });

  return matches.map((m) => (next.has(m.id) ? { ...m, ...next.get(m.id)! } : m));
}

export const MODE_LABEL: Record<EventMode, string> = { don: "Đơn", doi: "Đôi" };
export const BRACKET_LABEL: Record<BracketType, string> = {
  rr: "Vòng tròn",
  rr_ko: "Chia bảng + loại trực tiếp",
};
