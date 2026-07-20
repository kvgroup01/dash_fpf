import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Protege as rotas de página (não roda em /api/* — cada rota de API valida
 * sua própria autenticação, já que Server Functions ignoram o matcher do
 * proxy e a rota de cron usa segredo compartilhado, não sessão de usuário).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/anuncios";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Além de api/_next/favicon, exclui qualquer request com extensão de
  // arquivo (imagens e outros assets estáticos em public/, ex.: logo em
  // public/brand/) — sem isso o proxy também intercepta esses arquivos e
  // redireciona pro /login quando não há sessão, quebrando o carregamento.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
