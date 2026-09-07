import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { TournamentProvider, useTournament } from "../lib/tournament-store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="font-head text-7xl font-black uppercase tracking-tighter text-ink">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-ink">Không tìm thấy trang</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Trang bạn tìm không tồn tại hoặc đã được chuyển đi.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-accent">
            Về trang tạo giải
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="font-head text-xl font-black uppercase tracking-tight text-ink">
          Trang không tải được
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Bạn có thể thử lại hoặc quay về đầu.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-accent"
          >
            Thử lại
          </button>
          <a href="/" className="btn-ghost">
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Nảy Court" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,500;0,700;0,800;0,900;1,800;1,900&family=Sora:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Tạo giải" },
  { to: "/noi-dung", label: "Nội dung" },
  { to: "/van-dong-vien", label: "Danh sách VĐV" },
  { to: "/quan-ly-giai", label: "Quản lý giải" },
] as const;

function Header() {
  const { state } = useTournament();
  return (
    <div className="border-b-4 border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-accent">
            <span className="font-head text-lg font-black italic leading-none text-accent-foreground">
              P
            </span>
          </div>
          <div className="leading-none">
            <p className="font-head text-lg font-black uppercase italic tracking-tight">
              Nảy Court
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-line/60">
              Quản lý giải pickleball
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-line/70 hover:text-line"
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "rounded-lg px-3 py-2 bg-line text-paper" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {state.date ? (
            <span className="hidden text-xs font-semibold text-line/70 sm:block">
              Ngày thi đấu · {state.date}
            </span>
          ) : null}
          <span className="rounded-md bg-court px-2.5 py-1 text-xs font-semibold text-paper">
            {state.courts.length} sân
          </span>
        </div>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TournamentProvider>
        <div className="min-h-screen bg-paper font-body text-ink">
          <Header />
          <div className="courtlines">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
              {/* Required: nested routes render here. */}
              <Outlet />
            </div>
            <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-8 text-xs font-medium text-line/50 sm:px-6">
              <span className="size-2 shrink-0 rounded-full bg-accent" />
              <span>
                Nảy Court . Hệ thống quản lý điều hành giải chuyên nghiệp, hiện đại, đầy khả ái và
                ngây ngất lòng người...
              </span>
            </div>
          </div>
        </div>
      </TournamentProvider>
    </QueryClientProvider>
  );
}
