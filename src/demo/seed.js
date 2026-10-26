// Dados de exemplo: membros, compromissos, avisos e destaques fictícios.
// As datas são calculadas a partir do dia em que a demonstração é aberta.
import { DEMO_ADMIN_EMAIL, DEMO_MEMBRO_EMAIL } from "./config";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function emDias(base, dias) {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

function proximoDomingo(base, semanas = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7) + semanas * 7);
  return d;
}

export function gerarBancoDemo() {
  const hoje = new Date();
  const agora = hoje.toISOString();
  const nasc = (ano, deslocDias) => {
    const d = emDias(hoje, deslocDias);
    return `${ano}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const membros = [
    ["admin", "Secretaria Comunidade da Luz", DEMO_ADMIN_EMAIL, "1980-03-12", "Grupo Família"],
    ["ana", "Ana Ribeiro", DEMO_MEMBRO_EMAIL, nasc(1992, 6), "Grupo Esperança"],
    ["m1", "Carlos Henrique Alves", "carlos.alves@exemplo.demo", nasc(1975, 0), "Grupo Família"],
    ["m2", "Juliana Martins", "juliana.martins@exemplo.demo", nasc(1998, 3), "Grupo Jovens"],
    ["m3", "Pedro Santos", "pedro.santos@exemplo.demo", nasc(2001, 12), "Grupo Jovens"],
    ["m4", "Marlene Costa", "marlene.costa@exemplo.demo", nasc(1958, 20), "Grupo Vida"],
    ["m5", "Rafael Oliveira", "rafael.oliveira@exemplo.demo", "1987-01-25", "Grupo Fé"],
    ["m6", "Beatriz Lima", "beatriz.lima@exemplo.demo", "1995-05-08", "Grupo Esperança"],
    ["m7", "José Pereira", "jose.pereira@exemplo.demo", "1963-07-19", "Grupo Vida"],
    ["m8", "Camila Rocha", "camila.rocha@exemplo.demo", "1990-09-02", "Grupo Fé"],
    ["m9", "Lucas Ferreira", "lucas.ferreira@exemplo.demo", "2004-12-14", "Grupo Jovens"],
    ["m10", "Sônia Mendes", "sonia.mendes@exemplo.demo", "1970-04-30", "Grupo Família"],
  ];

  const profiles = membros.map(([id, nome, email, data, grupo], i) => ({
    id: `demo-${id}`,
    nome_completo: nome,
    email,
    telefone: `(38) 9${8100 + i * 37}-${String(1000 + i * 113).slice(0, 4)}`,
    data_nascimento: data,
    pgm: grupo,
    aceita_lembretes: i % 3 !== 2,
    created_at: emDias(hoje, -60 + i).toISOString(),
  }));

  const ana = "demo-ana";
  const compromisso = (id, dias, titulo, horario, lembrete, observacao = "") => ({
    id: `demo-ev-${id}`,
    profile_id: ana,
    titulo,
    data: iso(emDias(hoje, dias)),
    horario,
    lembrete,
    observacao,
    reminder_at: null,
    reminder_status: null,
    created_at: agora,
  });

  const personal_events = [
    compromisso(1, 1, "Consulta no dentista", "14:00", "1_hora_antes"),
    compromisso(2, 3, "Ensaio do louvor", "19:30", "1_dia_antes", "Levar o violão."),
    compromisso(3, 8, "Aniversário da mãe", "", "1_dia_antes"),
    compromisso(4, 15, "Reunião do Grupo Esperança", "20:00", "no_horario"),
  ];

  const aviso = (id, diasAtras, titulo, mensagem, extra = {}) => ({
    id: `demo-n-${id}`,
    titulo,
    mensagem,
    data_evento: null,
    status: "sent",
    tipo: "oficial",
    sent_at: emDias(hoje, -diasAtras).toISOString(),
    scheduled_at: null,
    created_at: emDias(hoje, -diasAtras).toISOString(),
    updated_at: emDias(hoje, -diasAtras).toISOString(),
    created_by_email: DEMO_ADMIN_EMAIL,
    ...extra,
  });

  const official_notifications = [
    aviso(1, 1, "Culto especial neste domingo", "Neste domingo teremos culto especial de gratidão às 19h30. Traga sua família!"),
    aviso(2, 4, "Retiro de jovens: inscrições abertas", "As inscrições para o retiro de jovens vão até sexta-feira. Fale com a liderança do Grupo Jovens."),
    aviso(3, 9, "Campanha de doação de alimentos", "Estamos arrecadando alimentos não perecíveis para famílias da comunidade. Entregue na secretaria."),
    aviso(4, 15, "Ensaio do coral remarcado", "O ensaio do coral desta semana passa para quinta-feira, às 19h."),
    aviso(5, 30, "Bem-vindo ao Calendário 2026!", "Agora a programação da igreja está na palma da sua mão. Ative os lembretes para não perder nada."),
    {
      ...aviso(6, 0, "Lembrete: Cantata de Natal", "Os ensaios da Cantata de Natal começam na próxima semana. Participe!"),
      status: "scheduled",
      sent_at: null,
      scheduled_at: emDias(hoje, 5).toISOString(),
    },
  ];

  const notification_reads = ["demo-n-3", "demo-n-4", "demo-n-5"].map((id) => ({
    profile_id: ana,
    email: DEMO_MEMBRO_EMAIL,
    notification_id: id,
    read_at: agora,
  }));

  const highlighted_dates = [
    { id: "demo-h-1", data: iso(proximoDomingo(hoje, 0)), titulo: "Culto especial de gratidão", tipo: "domingo_especial" },
    { id: "demo-h-2", data: iso(proximoDomingo(hoje, 3)), titulo: "Santa Ceia e batismos", tipo: "domingo_especial" },
  ].map((h) => ({ ...h, created_by_email: DEMO_ADMIN_EMAIL, created_at: agora, updated_at: agora }));

  const birthday_permissions = profiles
    .filter((p) => p.id !== "demo-admin")
    .slice(0, 6)
    .map((p) => ({
      profile_id: p.id,
      email: p.email,
      status: "autorizado",
      observacao: null,
      updated_by_email: DEMO_ADMIN_EMAIL,
      updated_at: agora,
    }));

  return { profiles, personal_events, official_notifications, notification_reads, highlighted_dates, birthday_permissions };
}
