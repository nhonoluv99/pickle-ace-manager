import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Player = { id: string; name: string; rating: number };
export type Team = { id: string; name: string; playerIds: string[] };
export type Group = { name: string; teamIds: string[] };
export type Match = {
  id: string;
  stage: "group" | "ko";
  groupName: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  court: string;
};
export type FormatId = "group_knockout" | "round_robin" | "doi_dong_doi";
export type PairMode = "random" | "fixed" | "manual_teams";
export type RegFormat = "don" | "doi" | "dong_doi";

export type TournamentState = {
  name: string;
  courtCount: number;
  courts: string[];
  date: string;
  players: Player[];
  teams: Team[];
  regFormat: RegFormat;
  teamSize: number;
  pairMode: PairMode;
  groupCount: number;
  groups: Group[];
  format: FormatId;
  matches: Match[];
};

const STORAGE_KEY = "nay-court-tournament-v2";

const initialState: TournamentState = {
  name: "",
  courtCount: 2,
  courts: ["Sân 1", "Sân 2"],
  date: "",
  players: [],
  teams: [],
  regFormat: "doi",
  teamSize: 2,
  pairMode: "random",
  groupCount: 2,
  groups: [],
  format: "group_knockout",
  matches: [],
};

const uid = () => Math.random().toString(36).slice(2, 10);

type Ctx = {
  state: TournamentState;
  update: (patch: Partial<TournamentState>) => void;
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

  const update = useCallback((patch: Partial<TournamentState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ state, update, reset }), [state, update, reset]);

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament phải nằm trong TournamentProvider");
  return ctx;
}

/* ---------- Logic bốc thăm & chia bảng ---------- */

export function makePlayer(name: string, rating = 0): Player {
  return { id: uid(), name, rating };
}

export function makeTeam(name: string, playerIds: string[] = []): Team {
  return { id: uid(), name, playerIds };
}

/** Bốc thăm ngẫu nhiên cân bằng theo điểm trình (snake: mạnh ghép yếu). */
export function drawTeamsByRating(players: Player[], teamSize: number): Team[] {
  if (teamSize <= 1) return players.map((p) => makeTeam(p.name, [p.id]));
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const sorted = shuffled.sort((a, b) => b.rating - a.rating);
  const teamCount = Math.ceil(sorted.length / teamSize);
  const buckets: Player[][] = Array.from({ length: teamCount }, () => []);
  sorted.forEach((p, i) => {
    const round = Math.floor(i / teamCount);
    const pos = i % teamCount;
    const idx = round % 2 === 0 ? pos : teamCount - 1 - pos;
    buckets[idx]!.push(p);
  });
  return buckets
    .filter((b) => b.length > 0)
    .map((b) => makeTeam(b.map((p) => p.name).join(" & "), b.map((p) => p.id)));
}

/** Bắt cặp theo thứ tự nhập (cặp từ đầu với nhau). */
export function pairTeamsInOrder(players: Player[], teamSize: number): Team[] {
  const teams: Team[] = [];
  for (let i = 0; i < players.length; i += teamSize) {
    const chunk = players.slice(i, i + teamSize);
    teams.push(makeTeam(chunk.map((p) => p.name).join(" & "), chunk.map((p) => p.id)));
  }
  return teams;
}

const GROUP_LETTERS = "ABCDEFGH".split("");

/** Chia bảng tự động, rải đều theo điểm trình trung bình của đội. */
export function splitGroups(teams: Team[], players: Player[], groupCount: number): Group[] {
  const ratingOf = (t: Team) => {
    const rs = t.playerIds
      .map((id) => players.find((p) => p.id === id)?.rating ?? 0)
      .filter((r) => r > 0);
    return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
  };
  const sorted = [...teams].sort((a, b) => ratingOf(b) - ratingOf(a));
  const n = Math.max(1, Math.min(groupCount, GROUP_LETTERS.length));
  const groups: Group[] = Array.from({ length: n }, (_, i) => ({
    name: `Bảng ${GROUP_LETTERS[i]}`,
    teamIds: [],
  }));
  sorted.forEach((t, i) => {
    const round = Math.floor(i / n);
    const pos = i % n;
    const idx = round % 2 === 0 ? pos : n - 1 - pos;
    groups[idx]!.teamIds.push(t.id);
  });
  return groups;
}

function roundRobinPairs(ids: string[]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) out.push([ids[i]!, ids[j]!]);
  }
  return out;
}

export function generateMatches(
  format: FormatId,
  teams: Team[],
  groups: Group[],
  courts: string[],
): Match[] {
  const matches: Match[] = [];
  const court = (i: number) => courts[i % Math.max(1, courts.length)] ?? "Sân 1";

  if (format === "round_robin" || groups.length === 0) {
    roundRobinPairs(teams.map((t) => t.id)).forEach(([a, b], i) => {
      matches.push({
        id: uid(),
        stage: "group",
        groupName: "Vòng tròn",
        teamA: a,
        teamB: b,
        scoreA: null,
        scoreB: null,
        court: court(i),
      });
    });
    return matches;
  }

  let idx = 0;
  groups.forEach((g) => {
    roundRobinPairs(g.teamIds).forEach(([a, b]) => {
      matches.push({
        id: uid(),
        stage: "group",
        groupName: g.name,
        teamA: a,
        teamB: b,
        scoreA: null,
        scoreB: null,
        court: court(idx++),
      });
    });
  });
  return matches;
}

/** Tạo vòng loại trực tiếp từ đội đứng đầu mỗi bảng. */
export function generateKnockout(
  groups: Group[],
  standings: (groupName: string) => StandingRow[],
  courts: string[],
): Match[] {
  const qualified: string[] = [];
  groups.forEach((g) => {
    const rows = standings(g.name);
    if (rows[0]) qualified.push(rows[0].teamId);
    if (rows[1]) qualified.push(rows[1].teamId);
  });
  const matches: Match[] = [];
  for (let i = 0; i < qualified.length - 1; i += 2) {
    matches.push({
      id: uid(),
      stage: "ko",
      groupName: "Loại trực tiếp",
      teamA: qualified[i]!,
      teamB: qualified[i + 1]!,
      scoreA: null,
      scoreB: null,
      court: courts[(i / 2) % Math.max(1, courts.length)] ?? "Sân 1",
    });
  }
  return matches;
}

export type StandingRow = {
  teamId: string;
  played: number;
  win: number;
  loss: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number;
};

export function computeStandings(teamIds: string[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  teamIds.forEach((id) =>
    rows.set(id, {
      teamId: id,
      played: 0,
      win: 0,
      loss: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      points: 0,
    }),
  );
  matches.forEach((m) => {
    if (m.scoreA === null || m.scoreB === null) return;
    const a = rows.get(m.teamA);
    const b = rows.get(m.teamB);
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
      a.points += 3;
    } else if (m.scoreB > m.scoreA) {
      b.win++;
      a.loss++;
      b.points += 3;
    } else {
      a.points++;
      b.points++;
    }
  });
  return [...rows.values()]
    .map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }))
    .sort((x, y) => y.points - x.points || y.diff - x.diff || y.pointsFor - x.pointsFor);
}

export const FORMATS: Array<{ id: FormatId; label: string; desc: string }> = [
  {
    id: "group_knockout",
    label: "Chia bảng",
    desc: "Bảng vòng tròn chuyển sang loại trực tiếp.",
  },
  { id: "round_robin", label: "Vòng tròn", desc: "Mỗi đội gặp nhau một lượt duy nhất." },
  { id: "doi_dong_doi", label: "Đồng đội", desc: "Bắt cặp sẵn theo điểm trình." },
];
