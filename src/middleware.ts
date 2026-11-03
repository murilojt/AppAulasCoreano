import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/entrar" } });

export const config = {
  matcher: ["/trilha/:path*", "/licao/:path*", "/revisao/:path*", "/conversa/:path*", "/progresso/:path*", "/api/lessons/:path*", "/api/review/:path*", "/api/conversation/:path*", "/api/conversations/:path*", "/api/progress/:path*"],
};
