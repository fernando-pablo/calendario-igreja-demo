// Versão de demonstração: não existe Supabase. Este "cliente falso" imita só o que o app usa
// (sessão do administrador). Todos os dados passam por src/demo/backend.js e ficam no navegador.
import { DEMO_ADMIN_EMAIL } from "./demo/config";

const CHAVE_SESSAO = "pibdemo_admin_session";

function sessaoAtual() {
  return localStorage.getItem(CHAVE_SESSAO) === "true"
    ? { access_token: "demo", user: { email: DEMO_ADMIN_EMAIL } }
    : null;
}

// Consulta direta ao banco (usada pelo app só como plano B): devolve vazio.
function consultaVazia() {
  const resultado = Promise.resolve({ data: [], error: null });
  const encadeia = new Proxy(() => {}, {
    get: (_, prop) => (prop === "then" ? resultado.then.bind(resultado) : () => encadeia),
    apply: () => encadeia,
  });
  return encadeia;
}

export const isSupabaseConfigured = true;

export const supabase = {
  auth: {
    async getSession() {
      return { data: { session: sessaoAtual() }, error: null };
    },
    async signInWithPassword({ email }) {
      if (String(email).trim().toLowerCase() !== DEMO_ADMIN_EMAIL) {
        return { data: null, error: new Error("Conta sem acesso administrativo.") };
      }
      localStorage.setItem(CHAVE_SESSAO, "true");
      return { data: { session: sessaoAtual() }, error: null };
    },
    async signOut() {
      localStorage.removeItem(CHAVE_SESSAO);
      return { error: null };
    },
  },
  from: () => consultaVazia(),
};

export function entrarComoAdminDemo() {
  localStorage.setItem(CHAVE_SESSAO, "true");
}
