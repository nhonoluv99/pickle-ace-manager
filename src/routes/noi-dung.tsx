import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BRACKET_LABEL,
  MODE_LABEL,
  makeEvent,
  useTournament,
  type BracketType,
  type EventMode,
  type PairMode,
} from "@/lib/tournament-store";

export const Route = createFileRoute("/noi-dung")({
  head: () => ({
    meta: [
      { title: "Nội dung thi đấu — Nảy Court" },
      {
        name: "description",
        content:
          "Tạo nhiều nội dung trong một giải Pickleball: đơn hay đôi, vòng tròn hay chia bảng loại trực tiếp, tranh hạng ba, cơ chế ghép đội và điểm thắng thua vòng bảng.",
      },
      { property: "og:title", content: "Nội dung thi đấu — Nảy Court" },
      {
        property: "og:description",
        content: "Mỗi nội dung có thể thức, hình thức và cách tính điểm riêng.",
      },
    ],
  }),
  component: EventsPage,
});

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={
            value === o.id
              ? "rounded-lg bg-line px-3 py-2 text-sm font-semibold text-paper"
              : "rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-line/70 ring-1 ring-black/5"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <span className="block text-xs font-semibold uppercase tracking-wide text-line/70">
    {children}
  </span>
);

function EventsPage() {
  const { state, update, updateEvent } = useTournament();

  const addEvent = () =>
    update({ events: [...state.events, makeEvent(`Nội dung ${state.events.length + 1}`)] });

  const removeEvent = (id: string) =>
    update({
      events: state.events.filter((e) => e.id !== id),
      entries: state.entries.filter((e) => e.eventId !== id),
      matches: state.matches.filter((m) => m.eventId !== id),
    });

  return (
    <div className="max-w-4xl">
      <h1 className="text-balance font-head text-4xl font-black uppercase leading-none tracking-tighter">
        Nội dung thi đấu
      </h1>
      <p className="mt-2 max-w-xl text-sm text-line/60">
        Một giải có thể gồm nhiều nội dung, ví dụ Đôi nữ 4.3, Đôi hỗn hợp 5.0, Đơn nam 6.5. Mỗi nội
        dung có cấu hình riêng và chỉnh lại được bất cứ lúc nào.
      </p>

      <div className="mt-6 space-y-4">
        {state.events.map((ev) => (
          <div key={ev.id} className="panel p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <input
                className="field font-head text-lg font-extrabold"
                placeholder="Tên nội dung — VD: Đôi nữ 4.3"
                value={ev.name}
                maxLength={60}
                onChange={(e) => updateEvent(ev.id, { name: e.target.value })}
              />
              <button
                className="shrink-0 text-line/40 hover:text-destructive"
                onClick={() => removeEvent(ev.id)}
                aria-label={`Xoá ${ev.name}`}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Lbl>Thể thức</Lbl>
                <Seg<EventMode>
                  value={ev.mode}
                  options={[
                    { id: "don", label: MODE_LABEL.don },
                    { id: "doi", label: MODE_LABEL.doi },
                  ]}
                  onChange={(mode) => updateEvent(ev.id, { mode })}
                />
              </div>
              <div>
                <Lbl>Hình thức thi đấu</Lbl>
                <Seg<BracketType>
                  value={ev.bracket}
                  options={[
                    { id: "rr", label: BRACKET_LABEL.rr },
                    { id: "rr_ko", label: BRACKET_LABEL.rr_ko },
                  ]}
                  onChange={(bracket) => updateEvent(ev.id, { bracket })}
                />
              </div>
              {ev.mode === "doi" ? (
                <div>
                  <Lbl>Cơ chế ghép đội</Lbl>
                  <Seg<PairMode>
                    value={ev.pairMode}
                    options={[
                      { id: "random", label: "Bốc thăm ngẫu nhiên" },
                      { id: "fixed", label: "Tự bắt cặp từ đầu" },
                    ]}
                    onChange={(pairMode) => updateEvent(ev.id, { pairMode })}
                  />
                </div>
              ) : null}
              <div>
                <Lbl>Tuỳ chọn</Lbl>
                <label className="mt-1.5 flex w-fit items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold ring-1 ring-black/5">
                  <input
                    type="checkbox"
                    className="size-4 accent-[oklch(0.682_0.211_37.7)]"
                    checked={ev.thirdPlace}
                    onChange={(e) => updateEvent(ev.id, { thirdPlace: e.target.checked })}
                  />
                  Có trận tranh hạng 3
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <Lbl>Điểm thắng (vòng bảng)</Lbl>
                <input
                  type="number"
                  className="field mt-1.5"
                  value={ev.winPoints}
                  onChange={(e) => updateEvent(ev.id, { winPoints: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Lbl>Điểm hoà</Lbl>
                <input
                  type="number"
                  className="field mt-1.5"
                  value={ev.drawPoints}
                  onChange={(e) => updateEvent(ev.id, { drawPoints: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Lbl>Điểm thua</Lbl>
                <input
                  type="number"
                  className="field mt-1.5"
                  value={ev.lossPoints}
                  onChange={(e) => updateEvent(ev.id, { lossPoints: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          className="w-full rounded-xl border-2 border-dashed border-court/50 px-3 py-3 text-sm font-semibold text-court"
          onClick={addEvent}
        >
          + Thêm nội dung
        </button>

        <div className="flex gap-3">
          <Link to="/van-dong-vien" className="btn-accent">
            Tiếp tục — Danh sách VĐV
          </Link>
          <Link to="/" className="btn-ghost">
            Quay lại
          </Link>
        </div>
      </div>
    </div>
  );
}
