// "Servidor" da demonstração: responde às mesmas ações das Edge Functions do app real,
// usando o armazenamento do navegador. Nada sai do aparelho de quem testa.
import { gerarBancoDemo } from "./seed";

const CHAVE_BANCO = "pibdemo_db";
export const EVENTO_PUSH = "pibdemo-push";

function lerBanco() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_BANCO));
    if (salvo?.profiles) return salvo;
  } catch {
    /* recria abaixo */
  }
  const novo = gerarBancoDemo();
  localStorage.setItem(CHAVE_BANCO, JSON.stringify(novo));
  return novo;
}

function gravarBanco(db) {
  localStorage.setItem(CHAVE_BANCO, JSON.stringify(db));
}

export function garantirBancoDemo() {
  lerBanco();
  // A tela de "instale o app" fica de lado na demonstração, para o visitante ir direto ao calendário.
  if (!localStorage.getItem("pib2026_install_intro_done")) localStorage.setItem("pib2026_install_intro_done", "true");
}

export function restaurarBancoDemo() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("pibdemo_") || k.startsWith("pib2026_") || k === "calendario-pib-notificacao")
    .forEach((k) => localStorage.removeItem(k));
  lerBanco();
}

const id = () => `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const agora = () => new Date().toISOString();
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const normalizar = (email) => String(email || "").trim().toLowerCase();

function resposta(dados, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { "Content-Type": "application/json" } });
}

// Simula a chegada de uma notificação push: o app mostra um alerta na tela.
function simularPush(titulo, mensagem) {
  setTimeout(() => window.dispatchEvent(new CustomEvent(EVENTO_PUSH, { detail: { titulo, mensagem } })), 600);
}

const enviados = (db) => db.profiles.filter((p) => p.aceita_lembretes).length;

function perfilValido(db, profile_id, email) {
  return db.profiles.some((p) => p.id === profile_id && p.email === normalizar(email));
}

const CAMPOS_PERFIL = ["nome_completo", "email", "telefone", "data_nascimento", "pgm", "aceita_lembretes"];

const acoes = {
  user: {
    "get-profile": (db, { body }) => ({ ok: true, profile: db.profiles.find((p) => p.email === normalizar(body.email)) || null }),
    "save-profile": (db, { body }) => {
      const dados = {};
      for (const c of CAMPOS_PERFIL) if (body.profile && c in body.profile) dados[c] = body.profile[c];
      dados.email = normalizar(dados.email);
      if (!dados.email || !dados.nome_completo) return [{ error: "Nome e e-mail são obrigatórios." }, 400];
      let perfil = db.profiles.find((p) => p.email === dados.email);
      if (perfil) Object.assign(perfil, dados);
      else {
        perfil = { id: id(), created_at: agora(), aceita_lembretes: false, ...dados };
        db.profiles.unshift(perfil);
      }
      return { ok: true, profile: perfil };
    },
    "update-reminders": (db, { body }) => {
      if (!perfilValido(db, body.profile_id, body.email)) return [{ error: "Cadastro não encontrado." }, 401];
      db.profiles.find((p) => p.id === body.profile_id).aceita_lembretes = Boolean(body.aceita_lembretes);
      return { ok: true };
    },
    "list-events": (db, { body }) => {
      if (!perfilValido(db, body.profile_id, body.email)) return [{ error: "Cadastro não encontrado." }, 401];
      const events = db.personal_events.filter((e) => e.profile_id === body.profile_id).sort((a, b) => a.data.localeCompare(b.data));
      return { ok: true, events };
    },
    "save-event": (db, { body }) => {
      if (!perfilValido(db, body.profile_id, body.email)) return [{ error: "Cadastro não encontrado." }, 401];
      const e = body.event || {};
      if (!e.titulo || !e.data) return [{ error: "Título e data são obrigatórios." }, 400];
      db.personal_events.push({
        id: id(), profile_id: body.profile_id, titulo: e.titulo, data: e.data, horario: e.horario || null,
        lembrete: e.lembrete || null, observacao: e.observacao || null, reminder_at: e.reminder_at || null,
        reminder_status: e.reminder_at ? "pending" : null, created_at: agora(),
      });
      return { ok: true };
    },
    "delete-event": (db, { body }) => {
      if (!perfilValido(db, body.profile_id, body.email)) return [{ error: "Cadastro não encontrado." }, 401];
      db.personal_events = db.personal_events.filter((e) => !(e.id === body.id && e.profile_id === body.profile_id));
      return { ok: true };
    },
    "save-subscription": () => ({ ok: true }),
    "list-user-notifications": (db, { params }) => {
      const notifications = db.official_notifications
        .filter((n) => (n.status === "sent" || n.sent_at) && n.status !== "cancelled")
        .sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at)));
      const reads = db.notification_reads.filter((r) => r.profile_id === params.profile_id);
      return { ok: true, notifications, reads };
    },
    "mark-notification-read": (db, { body }) => {
      if (!db.notification_reads.some((r) => r.profile_id === body.profile_id && r.notification_id === body.notification_id)) {
        db.notification_reads.push({ profile_id: body.profile_id, email: normalizar(body.email), notification_id: body.notification_id, read_at: agora() });
      }
      return { ok: true };
    },
    "mark-all-notifications-read": (db, { body }) => {
      const ids = (body.notification_ids?.length ? body.notification_ids : db.official_notifications.map((n) => n.id));
      for (const nid of ids) acoes.user["mark-notification-read"](db, { body: { ...body, notification_id: nid } });
      return { ok: true, count: ids.length };
    },
  },
  admin: {
    "list-profiles": (db) => ({ ok: true, profiles: [...db.profiles].sort((a, b) => b.created_at.localeCompare(a.created_at)) }),
    "delete-profile": (db, { body }) => {
      db.personal_events = db.personal_events.filter((e) => e.profile_id !== body.id);
      db.profiles = db.profiles.filter((p) => p.id !== body.id);
      return { ok: true };
    },
    "list-official-notifications": (db) => ({
      ok: true,
      notifications: [...db.official_notifications].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }),
    "send-official-notification": (db, { body }) => {
      if (!body.titulo || !body.mensagem) return [{ error: "Título e mensagem são obrigatórios." }, 400];
      const n = {
        id: id(), titulo: body.titulo, mensagem: body.mensagem, data_evento: body.data_evento || null, status: "sent",
        tipo: body.tipo || "oficial", sent_at: agora(), scheduled_at: null, created_at: agora(), updated_at: agora(),
        created_by_email: body.created_by_email || null,
      };
      db.official_notifications.unshift(n);
      simularPush(n.titulo, n.mensagem);
      return { ok: true, notification: n, enviados: enviados(db), removidos: 0, falhas: 0 };
    },
    "create-official-notification": (db, { body }) => {
      if (!body.titulo || !body.mensagem) return [{ error: "Título e mensagem são obrigatórios." }, 400];
      const n = {
        id: id(), titulo: body.titulo, mensagem: body.mensagem, data_evento: body.data_evento || null,
        scheduled_at: body.scheduled_at || null, status: body.scheduled_at ? "scheduled" : "draft", tipo: body.tipo || "oficial",
        sent_at: null, created_at: agora(), updated_at: agora(), created_by_email: body.created_by_email || null,
      };
      db.official_notifications.unshift(n);
      return { ok: true, notification: n };
    },
    "cancel-official-notification": (db, { body }) => {
      const n = db.official_notifications.find((x) => x.id === body.id);
      if (!n) return [{ error: "Notificação não encontrada." }, 404];
      if (n.sent_at || n.status === "sent") return [{ error: "Notificação enviada não pode ser cancelada." }, 400];
      n.status = "cancelled";
      n.updated_at = agora();
      return { ok: true, status: "cancelled" };
    },
    "delete-official-notification": (db, { body }) => {
      db.notification_reads = db.notification_reads.filter((r) => r.notification_id !== body.id);
      db.official_notifications = db.official_notifications.filter((n) => n.id !== body.id);
      return { ok: true };
    },
    "list-highlighted-dates": (db) => ({
      ok: true,
      highlights: db.highlighted_dates.filter((h) => h.data >= hojeISO()).sort((a, b) => a.data.localeCompare(b.data)),
    }),
    "save-highlight": (db, { body }) => {
      if (!body.data || !body.titulo) return [{ error: "Data e título são obrigatórios." }, 400];
      const dados = { data: body.data, titulo: String(body.titulo).trim(), tipo: body.tipo || "domingo_especial", updated_at: agora() };
      let h = db.highlighted_dates.find((x) => x.data === body.data);
      if (h) Object.assign(h, dados);
      else {
        h = { id: id(), created_at: agora(), created_by_email: body.created_by_email || null, ...dados };
        db.highlighted_dates.push(h);
      }
      return { ok: true, highlight: h };
    },
    "delete-highlight": (db, { body }) => {
      db.highlighted_dates = db.highlighted_dates.filter((h) => h.id !== body.id);
      return { ok: true };
    },
    "list-birthday-permissions": (db) => ({ ok: true, permissions: db.birthday_permissions }),
    "save-birthday-permission": (db, { body }) => {
      const { usuario, status, observacao, adminEmail } = body;
      if (!usuario?.id || !status) return [{ error: "Dados incompletos." }, 400];
      const dados = { profile_id: usuario.id, email: usuario.email, status, observacao: observacao || null, updated_by_email: adminEmail || null, updated_at: agora() };
      const i = db.birthday_permissions.findIndex((p) => p.profile_id === usuario.id);
      if (i >= 0) db.birthday_permissions[i] = dados;
      else db.birthday_permissions.push(dados);
      return { ok: true, permission: dados };
    },
  },
  "process-notifications": {
    "": (db) => {
      let processed = 0;
      for (const n of db.official_notifications) {
        if (n.status === "scheduled" && n.scheduled_at && new Date(n.scheduled_at) <= new Date()) {
          n.status = "sent";
          n.sent_at = agora();
          processed += 1;
          simularPush(n.titulo, n.mensagem);
        }
      }
      return { ok: true, processed };
    },
  },
};

// Substitui a chamada às Edge Functions do Supabase.
export async function demoFetch(functionName, { action = "", body, params = {} } = {}) {
  await new Promise((r) => setTimeout(r, 180)); // pequena espera, como uma chamada de rede
  const handler = acoes[functionName]?.[action];
  if (!handler) return resposta({ error: `Ação ${functionName}/${action} não disponível na demonstração.` }, 400);
  const db = lerBanco();
  const resultado = handler(db, { body: body || {}, params });
  gravarBanco(db);
  return Array.isArray(resultado) ? resposta(resultado[0], resultado[1]) : resposta(resultado);
}
