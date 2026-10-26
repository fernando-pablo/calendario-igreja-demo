import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Shield,
  Trash2,
  User,
  Wifi,
  WifiOff,
  X
} from "lucide-react";
import { calendarData } from "./data/calendarData";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { DEMO, DEMO_ADMIN_EMAIL, IGREJA } from "./demo/config";
import { demoFetch } from "./demo/backend";
import { DemoEntrada } from "./demo/DemoChrome";

const ANO_BASE = 2026;

const PGM_OPTIONS = [
  "Grupo Esperança",
  "Grupo Família",
  "Grupo Jovens",
  "Grupo Vida",
  "Grupo Fé"
];

const monthThemes = {
  Janeiro: {
    className: "theme-janeiro",
    label: "Janeiro Branco",
    slogan: "Desligue. Se ligue."
  },
  Fevereiro: {
    className: "theme-fevereiro",
    label: "Fevereiro Cinza",
    slogan: "Drogas não"
  },
  Março: {
    className: "theme-marco",
    label: "Março Azul-marinho",
    slogan: "Pela eliminação da discriminação racial"
  },
  Abril: {
    className: "theme-abril",
    label: "Abril Amarelo",
    slogan: "Pela inclusão de pessoas com deficiência"
  },
  Maio: {
    className: "theme-maio",
    label: "Maio Laranja",
    slogan: "Contra o abuso e exploração sexual de crianças e adolescentes"
  },
  Junho: {
    className: "theme-junho",
    label: "Junho Vermelho",
    slogan: "Doe sangue, doe vida"
  },
  Julho: {
    className: "theme-julho",
    label: "Julho Roxo",
    slogan: "Combate ao tráfico de pessoas e apoio às Missões Estaduais"
  },
  Agosto: {
    className: "theme-agosto",
    label: "Agosto Lilás",
    slogan: "Conscientização e enfrentamento à violência doméstica contra a mulher"
  },
  Setembro: {
    className: "theme-setembro",
    label: "Setembro Amarelo",
    slogan: "Prevenção ao suicídio — falar é a melhor solução"
  },
  Outubro: {
    className: "theme-outubro",
    label: "Outubro Dourado",
    slogan: "Respeito não envelhece"
  },
  Novembro: {
    className: "theme-novembro",
    label: "Novembro Azul",
    slogan: "Promoção da gentileza e conscientização sobre a saúde do homem"
  },
  Dezembro: {
    className: "theme-dezembro",
    label: "Dezembro Vermelho",
    slogan: "Promoção solidária humana — amor em ação"
  }
};

const weekDays = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];

function isRunningAsPWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function getDiasDoMes(mesId) {
  return new Date(ANO_BASE, mesId, 0).getDate();
}

function getPrimeiroDiaSemana(mesId) {
  return new Date(ANO_BASE, mesId - 1, 1).getDay();
}

function getDataISO(mesId, dia) {
  const mes = String(mesId).padStart(2, "0");
  const day = String(dia).padStart(2, "0");
  return `${ANO_BASE}-${mes}-${day}`;
}

function getHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function getEventosDoDia(mes, dia) {
  if (!mes) return [];
  return mes.eventos.filter((evento) => evento.dia === dia);
}

function isDomingo(mesId, dia) {
  const data = new Date(ANO_BASE, mesId - 1, dia);
  return data.getDay() === 0;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isEventoDomingoEspecial(evento) {
  const titulo = normalizarTexto(evento.titulo);
  const categoria = normalizarTexto(evento.categoria);
  const texto = `${titulo} ${categoria}`;

  const palavrasEspeciais = [
    "ceia",
    "sessao ordinaria",
    "assembleia",
    "programacao especial",
    "culto especial",
    "conferencia",
    "aniversario da igreja",
    "batismo",
    "cantata",
    "acao missionaria",
    "churras family",
    "almoco",
    "encontro",
    "confraternizacao",
    "seminario",
    "retiro",
    "congresso",
    "jantar",
    "cafe",
    "acao social",
    "missao",
    "missoes",
    "celebracao especial",
    "programacao da igreja"
  ];

  return palavrasEspeciais.some((palavra) =>
    texto.includes(normalizarTexto(palavra))
  );
}

function isDomingoEspecialDaIgreja(mesId, dia, eventosIgreja) {
  if (!isDomingo(mesId, dia)) return false;
  if (!eventosIgreja || eventosIgreja.length === 0) return false;

  return eventosIgreja.some((evento) => isEventoDomingoEspecial(evento));
}

function nascimentoBateComDia(dataNascimento, mesId, dia) {
  if (!dataNascimento) return false;

  const [, mes, diaNasc] = dataNascimento.split("-");

  return Number(mes) === mesId && Number(diaNasc) === dia;
}

function formatarDataBR(dataISO) {
  if (!dataISO) return "";

  const [ano, mes, dia] = dataISO.split("-");

  if (!ano || !mes || !dia) return "";

  return `${dia}/${mes}/${ano}`;
}

function formatarCampoDataNascimento(valor) {
  const apenasNumeros = valor.replace(/\D/g, "").slice(0, 8);

  if (apenasNumeros.length <= 2) {
    return apenasNumeros;
  }

  if (apenasNumeros.length <= 4) {
    return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
  }

  return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(
    2,
    4
  )}/${apenasNumeros.slice(4)}`;
}

function converterDataBRParaISO(dataBR) {
  if (!dataBR) return null;

  const partes = dataBR.split("/");

  if (partes.length !== 3) return null;

  const [diaTexto, mesTexto, anoTexto] = partes;

  if (
    diaTexto.length !== 2 ||
    mesTexto.length !== 2 ||
    anoTexto.length !== 4
  ) {
    return null;
  }

  const dia = Number(diaTexto);
  const mes = Number(mesTexto);
  const ano = Number(anoTexto);

  if (!dia || !mes || !ano) return null;
  if (ano < 1900 || ano > new Date().getFullYear()) return null;
  if (mes < 1 || mes > 12) return null;

  const data = new Date(ano, mes - 1, dia);

  const dataExiste =
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia;

  if (!dataExiste) return null;

  const isoAno = String(ano).padStart(4, "0");
  const isoMes = String(mes).padStart(2, "0");
  const isoDia = String(dia).padStart(2, "0");

  return `${isoAno}-${isoMes}-${isoDia}`;
}

function criarIdLocal() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isAdminProfile(profile) {
  if (!profile?.email) return false;

  const adminEmail = DEMO ? DEMO_ADMIN_EMAIL : import.meta.env.VITE_ADMIN_EMAIL;

  if (!adminEmail) return false;

  return profile.email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}

function limparAcessoLocal() {
  localStorage.removeItem("pib2026_profile");
  localStorage.removeItem("pib2026_admin");

  if (supabase) {
    supabase.auth.signOut().catch(() => {});
  }
}

function normalizarPGM(valor) {
  const pgm = valor.trim();

  if (pgm.toUpperCase() === "NA") {
    return "NA";
  }

  return pgm;
}

function isPGMValido(valor) {
  const pgm = normalizarPGM(valor);

  return PGM_OPTIONS.includes(pgm) || pgm === "NA";
}

function getQuartasDoMes(mesId) {
  const diasNoMes = getDiasDoMes(mesId);
  const quartas = [];

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = new Date(ANO_BASE, mesId - 1, dia);

    if (data.getDay() === 3) {
      quartas.push(dia);
    }
  }

  return quartas;
}

function isEventoQuartaDinamico(evento) {
  const titulo = evento.titulo.toLowerCase();

  return (
    titulo.includes("grupos nos lares") ||
    titulo.includes("escola de líderes") ||
    titulo.includes("noite de louvor") ||
    titulo.includes("pgm") ||
    titulo.includes("ecm") ||
    titulo.includes("encontro capacitar") ||
    titulo.includes("projeto átrium") ||
    titulo.includes("projeto atrium")
  );
}

function aplicarEventosFixosDeQuarta(mesOriginal) {
  if (!mesOriginal) return null;

  const eventosSemQuartasDinamicas = mesOriginal.eventos.filter(
    (evento) => !isEventoQuartaDinamico(evento)
  );

  const quartas = getQuartasDoMes(mesOriginal.id);
  const totalQuartas = quartas.length;

  const eventosQuartas = quartas.map((dia, index) => {
    const numeroDaQuarta = index + 1;
    const ultimaQuarta = numeroDaQuarta === totalQuartas;

    if (numeroDaQuarta === 2) {
      return {
        dia,
        titulo: "Escola de líderes",
        horario: "",
        categoria: "Capacitação"
      };
    }

    if (ultimaQuarta) {
      return {
        dia,
        titulo: "Noite de louvor",
        horario: "19h30",
        categoria: "Projeto"
      };
    }

    return {
      dia,
      titulo: "Grupos nos lares",
      horario: "",
      categoria: "PGM"
    };
  });

  return {
    ...mesOriginal,
    eventos: [...eventosSemQuartasDinamicas, ...eventosQuartas].sort(
      (a, b) => a.dia - b.dia
    )
  };
}

function getDataHoraCompromisso(evento) {
  if (!evento?.data || !evento?.horario) return null;

  const horario = evento.horario.length === 5 ? `${evento.horario}:00` : evento.horario;
  const dataHora = new Date(`${evento.data}T${horario}`);

  if (Number.isNaN(dataHora.getTime())) return null;

  return dataHora;
}

function getDataHoraLembrete(evento) {
  const dataHoraCompromisso = getDataHoraCompromisso(evento);

  if (!dataHoraCompromisso || !evento?.lembrete) return null;

  const dataHoraLembrete = new Date(dataHoraCompromisso);

  switch (evento.lembrete) {
    case "no_horario":
      return dataHoraLembrete;

    case "1_hora_antes":
      dataHoraLembrete.setHours(dataHoraLembrete.getHours() - 1);
      return dataHoraLembrete;

    case "1_dia_antes":
      dataHoraLembrete.setDate(dataHoraLembrete.getDate() - 1);
      return dataHoraLembrete;

    case "2_dias_antes":
      dataHoraLembrete.setDate(dataHoraLembrete.getDate() - 2);
      return dataHoraLembrete;

    default:
      return null;
  }
}

function getReminderAtISO(evento) {
  if (!evento?.lembrete || evento.lembrete === "sem_lembrete") return null;

  const dataHoraLembrete = getDataHoraLembrete(evento);
  if (!dataHoraLembrete) return null;

  return dataHoraLembrete.toISOString();
}

function getTextoTipoLembrete(lembrete) {
  switch (lembrete) {
    case "no_horario":
      return "agora";

    case "1_hora_antes":
      return "em 1 hora";

    case "1_dia_antes":
      return "amanhã";

    case "2_dias_antes":
      return "em 2 dias";

    default:
      return "";
  }
}

function getChaveLembreteDisparado(evento, dataHoraLembrete) {
  return `pib2026_lembrete_disparado_${evento.id}_${dataHoraLembrete.getTime()}`;
}

function formatarHorario(horario) {
  if (!horario) return "";

  return horario.slice(0, 5);
}

function getTagLembrete(evento) {
  // Mesma tag usada pelo push do servidor (process-notifications).
  // Se o app aberto e o servidor mostrarem o mesmo lembrete, um substitui o outro em vez de duplicar.
  return `compromisso-${evento.id}`;
}

async function mostrarNotificacao(titulo, options) {
  // No Android, o Chrome não aceita `new Notification()` (erro "Illegal constructor").
  // Pedir ao service worker para mostrar funciona no Android, no iPhone e no computador.
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(titulo, options);
    return;
  }

  new Notification(titulo, options);
}

function dispararNotificacaoCompromisso(evento) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const tipoLembrete = getTextoTipoLembrete(evento.lembrete);
  const horario = formatarHorario(evento.horario);

  const body =
    tipoLembrete === "agora"
      ? `Você tem um compromisso agora: ${evento.titulo}${horario ? ` às ${horario}` : ""
      }.`
      : `Você tem um compromisso ${tipoLembrete}: ${evento.titulo}${horario ? ` às ${horario}` : ""
      }.`;

  mostrarNotificacao(IGREJA.app, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: getTagLembrete(evento),
    renotify: false,
    data: { url: "/" }
  }).catch((error) => {
    console.error("Erro ao mostrar lembrete:", error);
  });
}

async function salvarProfile(profile) {
  const { data_nascimento_texto, ...profileLimpo } = profile;

  const payload = {
    ...profileLimpo,
    email: profile.email.trim().toLowerCase(),
    pgm: normalizarPGM(profile.pgm)
  };

  if (isSupabaseConfigured && supabase) {
    const result = await chamarFuncao("user", "save-profile", { body: { profile: payload } });
    return result.profile;
  }

  const localProfile = {
    ...payload,
    id: payload.id || criarIdLocal(),
    created_at: new Date().toISOString()
  };

  const usuarios = JSON.parse(localStorage.getItem("pib2026_local_profiles") || "[]");
  const filtrados = usuarios.filter((user) => user.email !== localProfile.email);
  const atualizados = [localProfile, ...filtrados];

  localStorage.setItem("pib2026_local_profiles", JSON.stringify(atualizados));

  return localProfile;
}

async function buscarProfilePorEmail(email) {
  const emailTratado = email.trim().toLowerCase();

  if (!emailTratado) {
    throw new Error("Informe um e-mail válido.");
  }

  if (isSupabaseConfigured && supabase) {
    const result = await chamarFuncao("user", "get-profile", { body: { email: emailTratado } });
    return result.profile || null;
  }

  const usuarios = JSON.parse(localStorage.getItem("pib2026_local_profiles") || "[]");

  return usuarios.find((user) => user.email === emailTratado) || null;
}

async function validarProfileOnline(profileSalvo) {
  if (!profileSalvo?.email) {
    limparAcessoLocal();
    return null;
  }

  if (!navigator.onLine) {
    return profileSalvo;
  }

  if (!isSupabaseConfigured || !supabase) {
    return profileSalvo;
  }

  let data;

  try {
    const result = await chamarFuncao("user", "get-profile", {
      body: { email: profileSalvo.email.trim().toLowerCase() }
    });
    data = result.profile;
  } catch (error) {
    console.error("Erro ao validar cadastro:", error);
    return profileSalvo;
  }

  if (!data) {
    limparAcessoLocal();
    return null;
  }

  localStorage.setItem("pib2026_profile", JSON.stringify(data));
  return data;
}

async function listarProfiles() {
  if (isSupabaseConfigured && supabase) {
    const result = await chamarFuncao("admin", "list-profiles", { method: "GET", admin: true });
    return result.profiles || [];
  }

  return JSON.parse(localStorage.getItem("pib2026_local_profiles") || "[]");
}

async function excluirProfile(usuarioId) {
  if (isSupabaseConfigured && supabase) {
    await chamarFuncao("admin", "delete-profile", { admin: true, body: { id: usuarioId } });
    return;
  }

  const usuarios = JSON.parse(localStorage.getItem("pib2026_local_profiles") || "[]");
  const eventos = JSON.parse(localStorage.getItem("pib2026_local_events") || "[]");

  localStorage.setItem(
    "pib2026_local_profiles",
    JSON.stringify(usuarios.filter((user) => user.id !== usuarioId))
  );

  localStorage.setItem(
    "pib2026_local_events",
    JSON.stringify(eventos.filter((event) => event.profile_id !== usuarioId))
  );
}

async function salvarCompromisso(profile, form) {
  const profileId = profile.id;
  const reminderAt = getReminderAtISO(form);

  if (isSupabaseConfigured && supabase) {
    await chamarFuncao("user", "save-event", {
      body: {
        profile_id: profile.id,
        email: profile.email,
        event: {
          titulo: form.titulo,
          data: form.data,
          horario: form.horario,
          lembrete: form.lembrete,
          observacao: form.observacao,
          reminder_at: reminderAt
        }
      }
    });

    return;
  }

  const eventos = JSON.parse(localStorage.getItem("pib2026_local_events") || "[]");

  eventos.push({
    id: criarIdLocal(),
    profile_id: profileId,
    titulo: form.titulo,
    data: form.data,
    horario: form.horario,
    lembrete: form.lembrete,
    observacao: form.observacao,
    reminder_at: reminderAt,
    reminder_status: reminderAt ? "pending" : null,
    reminder_sent_at: null,
    created_at: new Date().toISOString()
  });

  localStorage.setItem("pib2026_local_events", JSON.stringify(eventos));
}

async function listarCompromissos(profile) {
  const profileId = profile.id;

  if (isSupabaseConfigured && supabase) {
    const result = await chamarFuncao("user", "list-events", {
      body: { profile_id: profile.id, email: profile.email }
    });

    return result.events || [];
  }

  const eventos = JSON.parse(localStorage.getItem("pib2026_local_events") || "[]");

  return eventos.filter((event) => event.profile_id === profileId);
}

async function excluirCompromissoPessoal(profile, eventoId) {
  if (isSupabaseConfigured && supabase) {
    await chamarFuncao("user", "delete-event", {
      body: { profile_id: profile.id, email: profile.email, id: eventoId }
    });

    return;
  }

  const eventos = JSON.parse(localStorage.getItem("pib2026_local_events") || "[]");

  localStorage.setItem(
    "pib2026_local_events",
    JSON.stringify(eventos.filter((event) => event.id !== eventoId))
  );
}



function getEdgeFunctionUrl(functionName, action, params = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL não está configurada.");
  }

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`);

  if (action) {
    url.searchParams.set("action", action);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function fetchEdgeFunction(functionName, { action, method = "GET", body, admin = false, params = {} } = {}) {
  if (DEMO) return demoFetch(functionName, { action, method, body, params });

  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (admin && supabase) {
    // O admin é conferido no servidor pelo login do Supabase Auth.
    // Nenhum código secreto fica no navegador.
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return fetch(getEdgeFunctionUrl(functionName, action, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

async function chamarFuncao(functionName, action, { method = "POST", body, admin = false, params } = {}) {
  const response = await fetchEdgeFunction(functionName, { action, method, body, admin, params });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || "Erro ao comunicar com o servidor.");
    error.status = response.status;
    throw error;
  }

  return result;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function registrarPushSubscription(profile) {
  // Na demonstração não existe servidor de push: os avisos são simulados na tela.
  if (DEMO) return true;

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  if (!profile?.id || !profile?.email) return false;
  if (!vapidPublicKey) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
  }

  const response = await fetchEdgeFunction("user", {
    action: "save-subscription",
    method: "POST",
    body: {
      profile_id: profile.id,
      email: profile.email,
      subscription,
      user_agent: navigator.userAgent
    }
  });

  if (!response.ok) {
    throw new Error("Não foi possível registrar este aparelho para notificações.");
  }

  return true;
}

async function listarNotificacoesOficiais() {
  try {
    const response = await fetchEdgeFunction("admin", {
      action: "list-official-notifications",
      admin: true
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao listar notificações oficiais.");
    }

    return result.notifications || [];
  } catch (apiError) {
    console.warn("Falha na API de notificações; tentando leitura direta:", apiError);

    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase
      .from("official_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return data || [];
  }
}

async function listarNotificacoesUsuario(profileId) {
  if (!profileId) {
    return { notificacoes: [], leituras: [] };
  }

  try {
    const response = await fetchEdgeFunction("user", {
      action: "list-user-notifications",
      params: { profile_id: profileId }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao listar notificações do usuário.");
    }

    return {
      notificacoes: result.notifications || [],
      leituras: result.reads || []
    };
  } catch (apiError) {
    console.warn("Falha na API de notificações do usuário; tentando leitura direta:", apiError);

    if (!isSupabaseConfigured || !supabase) {
      return { notificacoes: [], leituras: [] };
    }

    const { data: notificacoes, error: erroNotificacoes } = await supabase
      .from("official_notifications")
      .select("*")
      .or("status.eq.sent,sent_at.not.is.null")
      .neq("status", "cancelled")
      .order("sent_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (erroNotificacoes) throw erroNotificacoes;

    const { data: leituras, error: erroLeituras } = await supabase
      .from("notification_reads")
      .select("notification_id, read_at")
      .eq("profile_id", profileId);

    if (erroLeituras) throw erroLeituras;

    return { notificacoes: notificacoes || [], leituras: leituras || [] };
  }
}

async function marcarNotificacaoComoLida(profile, notificationId) {
  if (!profile?.id || !notificationId) {
    return null;
  }

  try {
    const response = await fetchEdgeFunction("user", {
      action: "mark-notification-read",
      method: "POST",
      body: {
        profile_id: profile.id,
        email: profile.email,
        notification_id: notificationId
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao marcar notificação como lida.");
    }

    return result.read || null;
  } catch (apiError) {
    console.warn("Falha na API de leitura; tentando gravação direta:", apiError);

    if (!isSupabaseConfigured || !supabase) return null;

    const { data, error } = await supabase
      .from("notification_reads")
      .upsert(
        {
          profile_id: profile.id,
          email: profile.email,
          notification_id: notificationId,
          read_at: new Date().toISOString()
        },
        { onConflict: "profile_id,notification_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}

async function marcarTodasNotificacoesComoLidas(profile, notificationIds = []) {
  if (!profile?.id || !profile?.email) {
    return [];
  }

  const ids = Array.isArray(notificationIds) ? notificationIds.filter(Boolean) : [];

  try {
    const response = await fetchEdgeFunction("user", {
      action: "mark-all-notifications-read",
      method: "POST",
      body: {
        profile_id: profile.id,
        email: profile.email,
        notification_ids: ids
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao marcar notificações como lidas.");
    }

    return result.reads || [];
  } catch (apiError) {
    console.warn("Falha na API para marcar todas como lidas; tentando gravação direta:", apiError);

    if (!isSupabaseConfigured || !supabase) return [];

    let idsParaMarcar = ids;

    if (idsParaMarcar.length === 0) {
      const { data: notificacoes, error: erroNotificacoes } = await supabase
        .from("official_notifications")
        .select("id")
        .or("status.eq.sent,sent_at.not.is.null")
        .neq("status", "cancelled")
        .limit(200);

      if (erroNotificacoes) throw erroNotificacoes;
      idsParaMarcar = (notificacoes || []).map((item) => item.id);
    }

    if (idsParaMarcar.length === 0) return [];

    const now = new Date().toISOString();
    const rows = idsParaMarcar.map((notification_id) => ({
      profile_id: profile.id,
      email: profile.email,
      notification_id,
      read_at: now
    }));

    const { data, error } = await supabase
      .from("notification_reads")
      .upsert(rows, { onConflict: "profile_id,notification_id" })
      .select();

    if (error) throw error;

    return data || [];
  }
}

async function excluirNotificacaoOficial(notificationId) {
  if (!notificationId) {
    throw new Error("ID da notificação não informado.");
  }

  const response = await fetchEdgeFunction("admin", {
    action: "delete-official-notification",
    method: "POST",
    admin: true,
    body: { id: notificationId }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Erro ao excluir notificação.");
  }

  return true;
}

async function listarDestaquesCalendario() {
  try {
    const response = await fetchEdgeFunction("admin", {
      action: "list-highlighted-dates",
      params: { t: Date.now() }
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao listar destaques.");
    }

    return result.highlights || [];
  } catch (apiError) {
    console.warn("Falha na API de destaques; tentando leitura direta:", apiError);

    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase
      .from("highlighted_dates")
      .select("*")
      .gte("data", getHojeISO())
      .order("data", { ascending: true });

    if (error) throw error;

    return data || [];
  }
}

async function salvarDestaqueCalendario(form, adminEmail) {
  try {
    const response = await fetchEdgeFunction("admin", {
      action: "save-highlight",
      method: "POST",
      admin: true,
      body: {
        data: form.data,
        titulo: form.titulo,
        tipo: form.tipo || "domingo_especial",
        created_by_email: adminEmail || null
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao salvar destaque.");
    }

    return result.highlight;
  } catch (apiError) {
    console.warn("Falha na API de destaque; tentando gravação direta:", apiError);

    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase não configurado.");
    }

    const payload = {
      data: form.data,
      titulo: form.titulo,
      tipo: form.tipo || "domingo_especial",
      created_by_email: adminEmail || null,
      updated_at: new Date().toISOString()
    };

    const { data: existente, error: erroBusca } = await supabase
      .from("highlighted_dates")
      .select("id")
      .eq("data", form.data)
      .maybeSingle();

    if (erroBusca) throw erroBusca;

    if (existente?.id) {
      const { data, error } = await supabase
        .from("highlighted_dates")
        .update(payload)
        .eq("id", existente.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("highlighted_dates")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}

async function excluirDestaqueCalendario(id) {
  try {
    const response = await fetchEdgeFunction("admin", {
      action: "delete-highlight",
      method: "POST",
      admin: true,
      body: { id }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao remover destaque.");
    }

    return true;
  } catch (apiError) {
    console.warn("Falha na API de remoção de destaque; tentando exclusão direta:", apiError);

    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase não configurado.");
    }

    const { error } = await supabase.from("highlighted_dates").delete().eq("id", id);

    if (error) throw error;

    return true;
  }
}

async function listarPermissoesAniversario() {
  try {
    const response = await fetchEdgeFunction("admin", {
      action: "list-birthday-permissions",
      admin: true
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao listar permissões de aniversário.");
    }

    return result.permissions || [];
  } catch (apiError) {
    console.warn("Falha na Edge Function de aniversariantes; tentando leitura direta:", apiError);

    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase.from("birthday_permissions").select("*");

    if (error) throw error;

    return data || [];
  }
}

async function salvarPermissaoAniversario(usuario, status, observacao, adminEmail) {
  try {
    const response = await fetchEdgeFunction("admin", {
      action: "save-birthday-permission",
      method: "POST",
      admin: true,
      body: { usuario, status, observacao, adminEmail }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Erro ao salvar permissão de aniversário.");
    }

    return result.permission;
  } catch (apiError) {
    console.warn("Falha na Edge Function de aniversário; tentando gravação direta:", apiError);

    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase não configurado.");
    }

    const { data, error } = await supabase
      .from("birthday_permissions")
      .upsert(
        {
          profile_id: usuario.id,
          email: usuario.email,
          status,
          observacao: observacao || null,
          updated_by_email: adminEmail || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "profile_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}

function getMesDataNascimento(dataNascimento) {
  if (!dataNascimento) return null;
  const partes = dataNascimento.split("-");
  if (partes.length !== 3) return null;
  return Number(partes[1]);
}

function getDiaDataNascimento(dataNascimento) {
  if (!dataNascimento) return null;
  const partes = dataNascimento.split("-");
  if (partes.length !== 3) return null;
  return Number(partes[2]);
}

function montarMensagemAniversario(usuario) {
  return `Hoje celebramos a vida de ${usuario.nome_completo}. Que Deus continue abençoando sua caminhada com graça, fé e alegria. A ${IGREJA.nome} se alegra com você!`;
}

function InstallIntroScreen({ onInstall, onContinue }) {
  return (
    <main className="installIntroPage">
      <section className="installIntroCard">
        <div className="installIntroIcon">
          <img src="/icon-192.png" alt={IGREJA.app} />
        </div>

        <span className="eyebrow">{IGREJA.app}</span>

        <h1>Instale o calendário</h1>

        <p>
          Para melhor experiência, instale o {IGREJA.app} no seu dispositivo.
          Depois disso, acesse pelo ícone do aplicativo.
        </p>

        <div className="installBenefits">
          <div>
            <strong>Acesso mais rápido</strong>
            <span>Abra direto pelo ícone instalado.</span>
          </div>

          <div>
            <strong>Funciona melhor no uso diário</strong>
            <span>Visual de aplicativo e calendário sempre à mão.</span>
          </div>

          <div>
            <strong>Uso mesmo sem internet</strong>
            <span>O calendário base pode abrir offline após o primeiro acesso.</span>
          </div>
        </div>

        <button className="primaryButton installMainButton" onClick={onInstall}>
          <Download size={20} />
          Instalar calendário
        </button>

        <button className="ghostButton installSecondaryButton" onClick={onContinue}>
          Já instalei / continuar
        </button>

        <small className="privacyText">
          Se a instalação automática não aparecer, o aplicativo mostrará o passo a passo
          correto para o seu dispositivo.
        </small>
      </section>
    </main>
  );
}

function RegisterScreen({ onRegistered, onInstall, canShowInstallButton }) {
  const [form, setForm] = useState({
    nome_completo: "",
    email: "",
    telefone: "",
    data_nascimento: "",
    data_nascimento_texto: "",
    pgm: "",
    aceita_lembretes: false
  });

  const [emailAcesso, setEmailAcesso] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAcesso, setLoadingAcesso] = useState(false);
  const [erro, setErro] = useState("");
  const [erroAcesso, setErroAcesso] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function atualizarDataNascimento(valor) {
    const valorFormatado = formatarCampoDataNascimento(valor);

    setForm((prev) => ({
      ...prev,
      data_nascimento_texto: valorFormatado,
      data_nascimento: ""
    }));
  }

  async function recuperarCadastro(event) {
    event.preventDefault();

    setErroAcesso("");

    if (!emailAcesso.trim()) {
      setErroAcesso("Informe seu e-mail para continuar.");
      return;
    }

    setLoadingAcesso(true);

    try {
      const profile = await buscarProfilePorEmail(emailAcesso);

      if (!profile) {
        setErroAcesso("Cadastro não encontrado. Faça o primeiro acesso abaixo.");
        return;
      }

      localStorage.setItem("pib2026_profile", JSON.stringify(profile));
      onRegistered(profile);
    } catch (error) {
      console.error(error);
      setErroAcesso("Não foi possível recuperar o cadastro. Verifique a conexão.");
    } finally {
      setLoadingAcesso(false);
    }
  }

  function validarAntesDeConfirmar(event) {
    event.preventDefault();
    setErro("");

    const pgmNormalizado = normalizarPGM(form.pgm);
    const dataNascimentoISO = converterDataBRParaISO(form.data_nascimento_texto);

    const camposObrigatoriosInvalidos =
      !form.nome_completo.trim() ||
      !form.email.trim() ||
      !form.telefone.trim() ||
      !form.data_nascimento_texto.trim() ||
      !pgmNormalizado;

    if (camposObrigatoriosInvalidos) {
      setErro("Preencha nome, e-mail, telefone, data de nascimento e PGM.");
      return;
    }

    if (!dataNascimentoISO) {
      setErro("Informe uma data de nascimento válida no formato DD/MM/AAAA.");
      return;
    }

    if (!isPGMValido(pgmNormalizado)) {
      setErro("Selecione um PGM válido da lista.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      data_nascimento: dataNascimentoISO,
      data_nascimento_texto: formatarDataBR(dataNascimentoISO),
      pgm: pgmNormalizado
    }));

    setConfirmando(true);
  }

  async function confirmarCadastro() {
    setErro("");
    setLoading(true);

    try {
      const data = await salvarProfile(form);
      localStorage.setItem("pib2026_profile", JSON.stringify(data));
      onRegistered(data);
    } catch (error) {
      console.error(error);
      setErro("Não foi possível salvar o cadastro.");
      setConfirmando(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      {confirmando && (
        <div className="modalOverlay">
          <section className="modalCard">
            <h2>Confirme seus dados</h2>
            <p>Confira se as informações estão corretas antes de acessar o calendário.</p>

            <div className="confirmList">
              <p>
                <strong>Nome:</strong> {form.nome_completo}
              </p>
              <p>
                <strong>E-mail:</strong> {form.email}
              </p>
              <p>
                <strong>Telefone:</strong> {form.telefone}
              </p>
              <p>
                <strong>Nascimento:</strong> {formatarDataBR(form.data_nascimento)}
              </p>
              <p>
                <strong>PGM:</strong> {form.pgm}
              </p>
              <p>
                <strong>Lembretes:</strong> {form.aceita_lembretes ? "Sim" : "Não"}
              </p>
            </div>

            {erro && <div className="errorBox">{erro}</div>}

            <div className="modalActions">
              <button
                type="button"
                className="ghostButton"
                onClick={() => setConfirmando(false)}
                disabled={loading}
              >
                Voltar e corrigir
              </button>

              <button
                type="button"
                className="primaryButton"
                onClick={confirmarCadastro}
                disabled={loading}
              >
                {loading ? "Salvando..." : "Confirmar cadastro"}
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="authCard">
        <div className="authLogo">
          <img src="/logo-pib.png" alt={IGREJA.nome} />
        </div>

        <span className="eyebrow">Acesso ao calendário</span>
        <h1>{IGREJA.app}</h1>

        <p>Calendário digital da {IGREJA.nome}.</p>

        {DEMO && <DemoEntrada />}

        {canShowInstallButton && (
          <button type="button" className="installInlineButton" onClick={onInstall}>
            <Download size={18} />
            Instalar calendário
          </button>
        )}

        {!isSupabaseConfigured && (
          <div className="warningBox">
            Modo local ativo: os dados ficam salvos apenas neste navegador.
          </div>
        )}

        <div className="existingAccessBox">
          <h2>Já tenho cadastro</h2>
          <p>
            Se você já se cadastrou antes, informe seu e-mail para acessar o calendário.
          </p>

          <form onSubmit={recuperarCadastro} className="formGrid">
            <label>
              E-mail cadastrado
              <input
                type="email"
                value={emailAcesso}
                onChange={(e) => setEmailAcesso(e.target.value)}
                placeholder="seuemail@gmail.com"
              />
            </label>

            {erroAcesso && <div className="errorBox">{erroAcesso}</div>}

            <button type="submit" className="primaryButton" disabled={loadingAcesso}>
              {loadingAcesso ? "Buscando..." : "Acessar calendário"}
            </button>
          </form>
        </div>

        <div className="registerDivider">
          <span>ou faça seu primeiro acesso</span>
        </div>

        <form onSubmit={validarAntesDeConfirmar} className="formGrid">
          <label>
            Nome completo *
            <input
              required
              value={form.nome_completo}
              onChange={(e) => updateField("nome_completo", e.target.value)}
              placeholder="Ex: Fernando Pablo"
            />
          </label>

          <label>
            E-mail *
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="seuemail@gmail.com"
            />
          </label>

          <label>
            Telefone/WhatsApp *
            <input
              required
              value={form.telefone}
              onChange={(e) => updateField("telefone", e.target.value)}
              placeholder="(38) 99999-9999"
            />
          </label>

          <label>
            Data de nascimento *
            <input
              required
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={form.data_nascimento_texto}
              onChange={(e) => atualizarDataNascimento(e.target.value)}
              placeholder="DD/MM/AAAA"
            />
          </label>

          <label>
            PGM *
            <input
              required
              list="pgm-options"
              value={form.pgm}
              onChange={(e) => updateField("pgm", e.target.value)}
              placeholder="Selecione ou digite seu PGM"
            />
            <datalist id="pgm-options">
              {PGM_OPTIONS.map((pgm) => (
                <option key={pgm} value={pgm} />
              ))}
            </datalist>
          </label>

          <label className="checkLine">
            <input
              type="checkbox"
              checked={form.aceita_lembretes}
              onChange={(e) => updateField("aceita_lembretes", e.target.checked)}
            />
            Desejo receber lembretes e avisos no app.
          </label>

          <small className="privacyText">
            Seus dados serão usados para identificação, lembretes, aniversário e
            organização do calendário digital.
          </small>

          {erro && <div className="errorBox">{erro}</div>}

          <button type="submit" className="primaryButton">
            Entrar no calendário
          </button>
        </form>
      </section>
    </main>
  );
}

function AdminScreen({ profile, onClose, onHighlightsChanged }) {
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [destaques, setDestaques] = useState([]);
  const [permissoesAniversario, setPermissoesAniversario] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("cadastros");
  const [mesAniversario, setMesAniversario] = useState(new Date().getMonth() + 1);

  const [notificationForm, setNotificationForm] = useState({
    titulo: "",
    mensagem: "",
    data_evento: "",
    scheduled_at: ""
  });

  const [highlightForm, setHighlightForm] = useState({
    data: "",
    titulo: "",
    tipo: "domingo_especial"
  });

  const permitido = isAdminProfile(profile);

  async function carregarUsuarios() {
    if (!permitido) return;

    setLoading(true);
    setErro("");

    try {
      const data = await listarProfiles();
      setUsuarios(data || []);
    } catch (error) {
      console.error(error);
      setErro("Erro ao carregar cadastros.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarNotificacoes() {
    if (!permitido) return;

    try {
      const data = await listarNotificacoesOficiais();
      setNotificacoes(data || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function carregarDestaques() {
    if (!permitido) return;

    try {
      const data = await listarDestaquesCalendario();
      setDestaques(data || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function carregarPermissoes() {
    if (!permitido) return;

    try {
      const data = await listarPermissoesAniversario();
      setPermissoesAniversario(data || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function carregarTudo() {
    await Promise.all([
      carregarUsuarios(),
      carregarNotificacoes(),
      carregarDestaques(),
      carregarPermissoes()
    ]);
  }

  useEffect(() => {
    if (autorizado && permitido) {
      carregarTudo();
    }
  }, [autorizado, permitido]);

  // Se o admin já entrou antes neste aparelho, a sessão do Supabase continua válida.
  useEffect(() => {
    if (!permitido || !supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const emailSessao = data?.session?.user?.email?.trim().toLowerCase();
      const emailPerfil = profile?.email?.trim().toLowerCase();
      setAutorizado(Boolean(emailSessao && emailSessao === emailPerfil));
    });
  }, [permitido, profile?.email]);

  async function validarAdmin(event) {
    event.preventDefault();

    if (!permitido) {
      setErro("Este cadastro não tem permissão administrativa.");
      return;
    }

    if (!supabase) {
      setErro("Supabase não configurado.");
      return;
    }

    if (!senha) {
      setErro("Digite a senha do administrador.");
      return;
    }

    setEntrando(true);
    setErro("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email.trim().toLowerCase(),
        password: senha
      });

      if (error) {
        setErro("Senha inválida.");
        return;
      }

      setSenha("");
      setAutorizado(true);
    } catch (error) {
      console.error(error);
      setErro("Não foi possível entrar. Verifique a conexão.");
    } finally {
      setEntrando(false);
    }
  }

  async function sairAdmin() {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }

    setAutorizado(false);
    setSenha("");
  }

  async function excluirUsuario(usuario) {
    const confirmar = window.confirm(
      `Deseja excluir o cadastro de ${usuario.nome_completo}?`
    );

    if (!confirmar) return;

    try {
      await excluirProfile(usuario.id);
      await carregarUsuarios();
    } catch (error) {
      console.error(error);
      setErro("Erro ao excluir cadastro.");
    }
  }

  function updateNotificationForm(field, value) {
    setNotificationForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateHighlightForm(field, value) {
    setHighlightForm((prev) => ({ ...prev, [field]: value }));
  }

  async function enviarNotificacaoAgora(event) {
    event.preventDefault();
    setErro("");

    if (!notificationForm.titulo.trim() || !notificationForm.mensagem.trim()) {
      setErro("Informe título e mensagem da notificação.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetchEdgeFunction("admin", {
        action: "send-official-notification",
        method: "POST",
        admin: true,
        body: {
          titulo: notificationForm.titulo.trim(),
          mensagem: notificationForm.mensagem.trim(),
          data_evento: notificationForm.data_evento || null,
          created_by_email: profile.email,
          url: "/"
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Erro ao enviar notificação.");
      }

      alert(`Notificação enviada para ${result.enviados || 0} aparelho(s).`);
      setNotificationForm({ titulo: "", mensagem: "", data_evento: "", scheduled_at: "" });
      await carregarNotificacoes();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Erro ao enviar notificação.");
    } finally {
      setLoading(false);
    }
  }

  async function agendarNotificacao(event) {
    event.preventDefault();
    setErro("");

    if (!notificationForm.titulo.trim() || !notificationForm.mensagem.trim()) {
      setErro("Informe título e mensagem da notificação.");
      return;
    }

    if (!notificationForm.scheduled_at) {
      setErro("Informe a data e hora do agendamento.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetchEdgeFunction("admin", {
        action: "create-official-notification",
        method: "POST",
        admin: true,
        body: {
          titulo: notificationForm.titulo.trim(),
          mensagem: notificationForm.mensagem.trim(),
          data_evento: notificationForm.data_evento || null,
          scheduled_at: new Date(notificationForm.scheduled_at).toISOString(),
          created_by_email: profile.email
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Erro ao agendar notificação.");
      }

      alert("Notificação agendada.");
      setNotificationForm({ titulo: "", mensagem: "", data_evento: "", scheduled_at: "" });
      await carregarNotificacoes();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Erro ao agendar notificação.");
    } finally {
      setLoading(false);
    }
  }

  async function processarNotificacoesAgendadas() {
    setErro("");
    setLoading(true);

    try {
      const response = await fetchEdgeFunction("process-notifications", {
        method: "POST",
        admin: true
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Erro ao processar notificações agendadas.");
      }

      alert(`Processamento concluído. ${result.processed?.length || 0} notificação(ões) enviada(s).`);
      await carregarNotificacoes();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Erro ao processar notificações agendadas.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelarNotificacao(item) {
    const confirmar = window.confirm(`Cancelar o agendamento/notificação "${item.titulo}"?`);

    if (!confirmar) return;

    setErro("");
    setLoading(true);

    try {
      const response = await fetchEdgeFunction("admin", {
        action: "cancel-official-notification",
        method: "POST",
        admin: true,
        body: { id: item.id }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Erro ao cancelar notificação.");
      }

      await carregarNotificacoes();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Erro ao cancelar notificação.");
    } finally {
      setLoading(false);
    }
  }

  async function removerNotificacao(item) {
    const confirmar = window.confirm(
      `Excluir permanentemente a notificação "${item.titulo}"? Ela também deixará de aparecer na central dos usuários.`
    );

    if (!confirmar) return;

    setErro("");
    setLoading(true);

    try {
      await excluirNotificacaoOficial(item.id);
      await carregarNotificacoes();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Erro ao excluir notificação.");
    } finally {
      setLoading(false);
    }
  }

  async function salvarDestaque(event) {
    event.preventDefault();
    setErro("");

    if (!highlightForm.data || !highlightForm.titulo.trim()) {
      setErro("Informe a data e o título do destaque.");
      return;
    }

    setLoading(true);

    try {
      await salvarDestaqueCalendario(
        {
          ...highlightForm,
          titulo: highlightForm.titulo.trim()
        },
        profile.email
      );

      setHighlightForm({ data: "", titulo: "", tipo: "domingo_especial" });
      await carregarDestaques();
      if (onHighlightsChanged) await onHighlightsChanged();
    } catch (error) {
      console.error(error);
      setErro("Erro ao salvar destaque.");
    } finally {
      setLoading(false);
    }
  }

  async function removerDestaque(destaque) {
    const confirmar = window.confirm(`Remover destaque de ${formatarDataBR(destaque.data)}?`);

    if (!confirmar) return;

    setLoading(true);

    try {
      await excluirDestaqueCalendario(destaque.id);
      await carregarDestaques();
      if (onHighlightsChanged) await onHighlightsChanged();
    } catch (error) {
      console.error(error);
      setErro("Erro ao remover destaque.");
    } finally {
      setLoading(false);
    }
  }

  function getPermissaoUsuario(usuario) {
    return permissoesAniversario.find((item) => item.profile_id === usuario.id);
  }

  async function alterarPermissaoAniversario(usuario, status) {
    setLoading(true);

    try {
      const atual = getPermissaoUsuario(usuario);
      await salvarPermissaoAniversario(usuario, status, atual?.observacao || "", profile.email);
      await carregarPermissoes();
    } catch (error) {
      console.error(error);
      setErro("Erro ao atualizar autorização de aniversário.");
    } finally {
      setLoading(false);
    }
  }

  async function enviarNotificacaoAniversario(usuario) {
    const permissao = getPermissaoUsuario(usuario);

    if (permissao?.status !== "autorizado") {
      alert("Marque este aniversariante como autorizado antes de enviar aviso público.");
      return;
    }

    const mensagem = montarMensagemAniversario(usuario);

    setLoading(true);

    try {
      const response = await fetchEdgeFunction("admin", {
        action: "send-official-notification",
        method: "POST",
        admin: true,
        body: {
          titulo: `Aniversariante ${IGREJA.nomeCurto}`,
          mensagem,
          created_by_email: profile.email,
          tipo: "aniversario",
          url: "/"
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Erro ao enviar notificação.");
      }

      alert(`Aviso de aniversário enviado para ${result.enviados || 0} aparelho(s).`);
      await carregarNotificacoes();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Erro ao enviar aviso de aniversário.");
    } finally {
      setLoading(false);
    }
  }

  function copiarMensagemAniversario(usuario) {
    const mensagem = montarMensagemAniversario(usuario);
    navigator.clipboard?.writeText(mensagem);
    alert("Mensagem copiada.");
  }

  const aniversariantesDoMes = usuarios
    .filter((usuario) => getMesDataNascimento(usuario.data_nascimento) === Number(mesAniversario))
    .sort((a, b) => getDiaDataNascimento(a.data_nascimento) - getDiaDataNascimento(b.data_nascimento));

  return (
    <main className="adminPage">
      <section className="adminHeader adminHeaderModern">
        <div>
          <span className="eyebrow">Administração</span>
          <h1>Painel {IGREJA.nomeCurto}</h1>
          <p>Cadastros, notificações oficiais, aniversariantes e destaques do calendário.</p>
        </div>

        <button className="ghostButton" onClick={onClose}>
          Voltar ao calendário
        </button>
      </section>

      {!permitido ? (
        <section className="authCard adminLogin">
          <Shield size={34} />
          <h2>Acesso não permitido</h2>
          <p>Este cadastro não possui permissão administrativa.</p>
        </section>
      ) : !autorizado ? (
        <section className="authCard adminLogin">
          <Shield size={34} />
          <h2>Acesso administrativo</h2>
          <p>Digite a senha do administrador para visualizar e manipular as informações.</p>

          <form onSubmit={validarAdmin} className="formGrid">
            <label>
              Senha do administrador
              <input
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
              />
            </label>

            {erro && <div className="errorBox">{erro}</div>}

            <button className="primaryButton" disabled={entrando}>
              {entrando ? "Entrando..." : "Acessar"}
            </button>
          </form>
        </section>
      ) : (
        <section className="adminCard adminPanelModern">
          <div className="adminTools">
            <strong>{usuarios.length} cadastro(s)</strong>

            <div>
              <button className="ghostButton" onClick={carregarTudo} disabled={loading}>
                Atualizar tudo
              </button>

              <button className="dangerButton" onClick={sairAdmin}>
                Sair do admin
              </button>
            </div>
          </div>

          <div className="adminTabs">
            <button className={aba === "cadastros" ? "active" : ""} onClick={() => setAba("cadastros")}>Cadastros</button>
            <button className={aba === "notificacoes" ? "active" : ""} onClick={() => setAba("notificacoes")}>Notificações oficiais</button>
            <button className={aba === "aniversariantes" ? "active" : ""} onClick={() => setAba("aniversariantes")}>Aniversariantes</button>
            <button className={aba === "destaques" ? "active" : ""} onClick={() => setAba("destaques")}>Destaques</button>
          </div>

          {!isSupabaseConfigured && (
            <div className="warningBox">
              Modo local: recursos administrativos avançados dependem do Supabase.
            </div>
          )}

          {erro && <div className="errorBox">{erro}</div>}

          {aba === "cadastros" && (
            <div className="adminSection">
              <div className="adminSectionHeader">
                <h2>Cadastros</h2>
                <p>Veja os usuários cadastrados e remova acessos quando necessário.</p>
              </div>

              {loading ? (
                <p className="muted">Carregando...</p>
              ) : usuarios.length === 0 ? (
                <p className="muted">Nenhum cadastro encontrado.</p>
              ) : (
                <div className="userTable">
                  {usuarios.map((usuario) => {
                    const usuarioNA = usuario.pgm?.trim().toUpperCase() === "NA";

                    return (
                      <article key={usuario.id} className="userRow">
                        <div className="userAvatar">
                          <User size={20} />
                        </div>

                        <div>
                          <strong>{usuario.nome_completo}</strong>
                          <span>{usuario.email}</span>
                          <p>
                            Tel: {usuario.telefone} • Nasc: {formatarDataBR(usuario.data_nascimento)}
                            {usuarioNA
                              ? " • PGM: NA — acompanhar"
                              : usuario.pgm
                                ? ` • ${usuario.pgm}`
                                : ""}
                          </p>
                        </div>

                        <button
                          className="deleteUserButton"
                          onClick={() => excluirUsuario(usuario)}
                          title="Excluir cadastro"
                        >
                          <Trash2 size={17} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {aba === "notificacoes" && (
            <div className="adminSection">
              <div className="adminSectionHeader">
                <h2>Notificações oficiais</h2>
                <p>Envie avisos para todos os usuários que permitiram notificações no app.</p>
              </div>

              <form className="adminGridForm" onSubmit={enviarNotificacaoAgora}>
                <label>
                  Título
                  <input
                    value={notificationForm.titulo}
                    onChange={(e) => updateNotificationForm("titulo", e.target.value)}
                    placeholder="Ex: Ceia do Senhor"
                  />
                </label>

                <label>
                  Data do evento opcional
                  <input
                    type="date"
                    value={notificationForm.data_evento}
                    onChange={(e) => updateNotificationForm("data_evento", e.target.value)}
                  />
                </label>

                <label className="wideField">
                  Mensagem
                  <textarea
                    value={notificationForm.mensagem}
                    onChange={(e) => updateNotificationForm("mensagem", e.target.value)}
                    placeholder="Escreva a mensagem que será enviada aos usuários."
                  />
                </label>

                <label>
                  Agendar para
                  <input
                    type="datetime-local"
                    value={notificationForm.scheduled_at}
                    onChange={(e) => updateNotificationForm("scheduled_at", e.target.value)}
                  />
                </label>

                <div className="adminFormActions">
                  <button className="primaryButton" type="submit" disabled={loading}>
                    Enviar agora
                  </button>

                  <button className="ghostButton" type="button" onClick={agendarNotificacao} disabled={loading}>
                    Agendar
                  </button>

                  <button className="ghostButton" type="button" onClick={processarNotificacoesAgendadas} disabled={loading}>
                    Processar agendadas agora
                  </button>
                </div>
              </form>

              <div className="adminListBlock">
                <h3>Histórico e agendamentos</h3>
                {notificacoes.length === 0 ? (
                  <p className="muted">Nenhuma notificação criada ainda.</p>
                ) : (
                  <div className="compactList">
                    {notificacoes.map((item) => {
                      const podeCancelar = ["draft", "scheduled", "pending_now"].includes(item.status);

                      return (
                        <article key={item.id}>
                          <div>
                            <strong>{item.titulo}</strong>
                            <span>
                              {item.status === "sent"
                                ? "Enviada"
                                : item.status === "scheduled"
                                  ? "Agendada"
                                  : item.status === "cancelled"
                                    ? "Cancelada"
                                    : item.status}
                              {item.scheduled_at ? ` • agendada: ${new Date(item.scheduled_at).toLocaleString("pt-BR")}` : ""}
                              {item.sent_at ? ` • enviada: ${new Date(item.sent_at).toLocaleString("pt-BR")}` : ""}
                            </span>
                            <p>{item.mensagem}</p>
                          </div>

                          <div className="adminItemActions">
                            {podeCancelar && (
                              <button
                                className="ghostButton"
                                type="button"
                                onClick={() => cancelarNotificacao(item)}
                                disabled={loading}
                              >
                                Cancelar
                              </button>
                            )}

                            <button
                              className="dangerButton"
                              type="button"
                              onClick={() => removerNotificacao(item)}
                              disabled={loading}
                            >
                              Excluir
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {aba === "aniversariantes" && (
            <div className="adminSection">
              <div className="adminSectionHeader">
                <h2>Aniversariantes</h2>
                <p>Consulte por mês, controle autorização e gere mensagens para avisos.</p>
              </div>

              <label className="adminMonthSelect">
                Mês
                <select value={mesAniversario} onChange={(e) => setMesAniversario(Number(e.target.value))}>
                  {calendarData.map((mes) => (
                    <option key={mes.id} value={mes.id}>{mes.mes}</option>
                  ))}
                </select>
              </label>

              {aniversariantesDoMes.length === 0 ? (
                <p className="muted">Nenhum aniversariante neste mês.</p>
              ) : (
                <div className="birthdayAdminList">
                  {aniversariantesDoMes.map((usuario) => {
                    const permissao = getPermissaoUsuario(usuario);
                    const status = permissao?.status || "nao_consultado";
                    const autorizado = status === "autorizado";

                    return (
                      <article key={usuario.id} className="birthdayAdminCard">
                        <div>
                          <strong>{getDiaDataNascimento(usuario.data_nascimento)}/{String(getMesDataNascimento(usuario.data_nascimento)).padStart(2, "0")} — {usuario.nome_completo}</strong>
                          <span>{usuario.telefone} • {usuario.pgm || "Sem PGM"}</span>
                          <p>Status: {status === "autorizado" ? "Autorizado" : status === "nao_autorizado" ? "Não autorizado" : "Ainda não consultado"}</p>
                        </div>

                        <div className="birthdayActions">
                          <button className="ghostButton" onClick={() => alterarPermissaoAniversario(usuario, "autorizado")}>Autorizado</button>
                          <button className="ghostButton" onClick={() => alterarPermissaoAniversario(usuario, "nao_autorizado")}>Não autorizado</button>
                          <button className="ghostButton" onClick={() => copiarMensagemAniversario(usuario)}>Copiar mensagem</button>
                          <button className="primaryButton" onClick={() => enviarNotificacaoAniversario(usuario)} disabled={!autorizado || loading}>Enviar aviso</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {aba === "destaques" && (
            <div className="adminSection">
              <div className="adminSectionHeader">
                <h2>Destaques do calendário</h2>
                <p>Marque datas importantes para aparecerem com destaque especial no calendário de todos os usuários.</p>
              </div>

              <form className="adminGridForm" onSubmit={salvarDestaque}>
                <label>
                  Data
                  <input
                    type="date"
                    value={highlightForm.data}
                    onChange={(e) => updateHighlightForm("data", e.target.value)}
                  />
                </label>

                <label>
                  Título do destaque
                  <input
                    value={highlightForm.titulo}
                    onChange={(e) => updateHighlightForm("titulo", e.target.value)}
                    placeholder="Ex: Ceia do Senhor"
                  />
                </label>

                <button className="primaryButton" disabled={loading}>Salvar destaque</button>
              </form>

              <div className="adminListBlock">
                <h3>Datas destacadas</h3>
                {destaques.length === 0 ? (
                  <p className="muted">Nenhuma data destacada.</p>
                ) : (
                  <div className="compactList">
                    {destaques.map((item) => (
                      <article key={item.id}>
                        <strong>{formatarDataBR(item.data)} — {item.titulo}</strong>
                        <span>{item.tipo}</span>
                        <button className="dangerButton" onClick={() => removerDestaque(item)}>Remover</button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}


function UserNotificationsModal({ notifications, readIds, onClose, onMarkRead, onMarkAllRead }) {
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  return (
    <div className="modalOverlay">
      <section className="modalCard userNotificationsModal">
        <button className="modalClose" onClick={onClose}>
          <X size={20} />
        </button>

        <h2>Notificações</h2>
        <p>Veja os avisos oficiais enviados pela igreja.</p>

        {notifications.length > 0 && (
          <div className="userNotificationsHeaderActions">
            <span>{unreadCount} não lida(s)</span>
            {unreadCount > 0 && (
              <button className="ghostButton" type="button" onClick={onMarkAllRead}>
                Marcar todas como lidas
              </button>
            )}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="emptyState">
            <p>Nenhuma notificação oficial foi enviada ainda.</p>
          </div>
        ) : (
          <div className="userNotificationsList">
            {notifications.map((item) => {
              const lida = readIds.includes(item.id);

              return (
                <article
                  key={item.id}
                  className={`userNotificationCard ${lida ? "read" : "unread"}`}
                  onClick={() => {
                    if (!lida) onMarkRead(item.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !lida) {
                      event.preventDefault();
                      onMarkRead(item.id);
                    }
                  }}
                >
                  <div>
                    <span>{lida ? "Lida" : "Nova"}</span>
                    <strong>{item.titulo}</strong>
                    <p>{item.mensagem}</p>
                    <small>
                      {item.sent_at
                        ? new Date(item.sent_at).toLocaleString("pt-BR")
                        : new Date(item.created_at).toLocaleString("pt-BR")}
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EventModal({ profile, selectedDate, onClose, onSaved }) {
  const [form, setForm] = useState({
    titulo: "",
    data: selectedDate,
    horario: "",
    lembrete: "sem_lembrete",
    observacao: ""
  });

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function salvar(event) {
    event.preventDefault();
    setErro("");

    if (!form.titulo || !form.data) {
      setErro("Informe o título e a data do compromisso.");
      return;
    }

    setLoading(true);

    try {
      await salvarCompromisso(profile, form);
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      setErro("Erro ao salvar compromisso pessoal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modalOverlay">
      <section className="modalCard">
        <button className="modalClose" onClick={onClose}>
          <X size={20} />
        </button>

        <h2>Novo compromisso</h2>
        <p>Esse compromisso ficará vinculado ao seu cadastro.</p>

        <form onSubmit={salvar} className="formGrid">
          <label>
            Título *
            <input
              value={form.titulo}
              onChange={(e) => updateField("titulo", e.target.value)}
              placeholder="Ex: Reunião, consulta, ensaio..."
            />
          </label>

          <label>
            Data *
            <input
              type="date"
              value={form.data}
              onChange={(e) => updateField("data", e.target.value)}
            />
          </label>

          <label>
            Horário
            <input
              type="time"
              value={form.horario}
              onChange={(e) => updateField("horario", e.target.value)}
            />
          </label>

          <label>
            Lembrete
            <select
              value={form.lembrete}
              onChange={(e) => updateField("lembrete", e.target.value)}
            >
              <option value="sem_lembrete">Sem lembrete</option>
              <option value="no_horario">No horário</option>
              <option value="1_hora_antes">1 hora antes</option>
              <option value="1_dia_antes">1 dia antes</option>
              <option value="2_dias_antes">2 dias antes</option>
            </select>
          </label>

          <label>
            Observação
            <textarea
              value={form.observacao}
              onChange={(e) => updateField("observacao", e.target.value)}
              placeholder="Observações do compromisso..."
            />
          </label>

          {erro && <div className="errorBox">{erro}</div>}

          <button className="primaryButton" disabled={loading}>
            {loading ? "Salvando..." : "Salvar compromisso"}
          </button>
        </form>
      </section>
    </div>
  );
}

function MyEventsModal({ events, onClose, onDelete }) {
  const eventosOrdenados = [...events].sort((a, b) => {
    const dataA = `${a.data || ""} ${a.horario || ""}`;
    const dataB = `${b.data || ""} ${b.horario || ""}`;
    return dataA.localeCompare(dataB);
  });

  return (
    <div className="modalOverlay">
      <section className="modalCard myEventsModal">
        <button className="modalClose" onClick={onClose}>
          <X size={20} />
        </button>

        <h2>Meus compromissos</h2>
        <p>Veja e controle os compromissos pessoais que você criou.</p>

        {eventosOrdenados.length === 0 ? (
          <div className="emptyState">
            <p>Você ainda não criou compromissos pessoais.</p>
          </div>
        ) : (
          <div className="myEventsList">
            {eventosOrdenados.map((evento) => (
              <article key={evento.id} className="myEventRow">
                <div>
                  <strong>{evento.titulo}</strong>
                  <span>
                    {formatarDataBR(evento.data)}
                    {evento.horario ? ` • ${evento.horario}` : ""}
                  </span>
                  {evento.observacao && <p>{evento.observacao}</p>}
                </div>

                <button
                  className="deleteUserButton"
                  onClick={() => onDelete(evento)}
                  title="Excluir compromisso"
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const mesAtualSistema = new Date().getMonth() + 1;
  const diaAtualSistema = new Date().getDate();

  const [profile, setProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [viewAdmin, setViewAdmin] = useState(() => {
    const abrir = DEMO && sessionStorage.getItem("pibdemo_abrir_admin") === "1";
    sessionStorage.removeItem("pibdemo_abrir_admin");
    return abrir || window.location.pathname === "/admin";
  });
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualSistema);
  const [diaSelecionado, setDiaSelecionado] = useState(diaAtualSistema);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installIntroDone, setInstallIntroDone] = useState(
    localStorage.getItem("pib2026_install_intro_done") === "true" || isRunningAsPWA()
  );
  const [notificacaoAtiva, setNotificacaoAtiva] = useState(
    localStorage.getItem("calendario-pib-notificacao") === "ativa"
  );
  const [personalEvents, setPersonalEvents] = useState([]);
  const [highlightedDates, setHighlightedDates] = useState([]);
  const [userNotifications, setUserNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showMyEventsModal, setShowMyEventsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function iniciarApp() {
      const savedProfile = localStorage.getItem("pib2026_profile");

      if (!savedProfile) {
        if (mounted) {
          setCheckingProfile(false);
        }

        return;
      }

      try {
        const parsedProfile = JSON.parse(savedProfile);
        const profileValidado = await validarProfileOnline(parsedProfile);

        if (!mounted) return;

        if (profileValidado) {
          setProfile(profileValidado);
        } else {
          setProfile(null);
          setViewAdmin(false);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil salvo:", error);

        if (mounted) {
          limparAcessoLocal();
          setProfile(null);
          setViewAdmin(false);
        }
      } finally {
        if (mounted) {
          setCheckingProfile(false);
        }
      }
    }

    iniciarApp();

    const handleOnline = async () => {
      setOnline(true);

      const savedProfile = localStorage.getItem("pib2026_profile");

      if (!savedProfile) return;

      try {
        const parsedProfile = JSON.parse(savedProfile);
        const profileValidado = await validarProfileOnline(parsedProfile);

        if (!profileValidado) {
          setProfile(null);
          setViewAdmin(false);
          setPersonalEvents([]);
          alert(
            "Seu cadastro não está mais ativo no calendário. Faça o cadastro novamente para continuar."
          );
          return;
        }

        setProfile(profileValidado);
      } catch (error) {
        console.error("Erro ao validar cadastro ao voltar online:", error);
      }
    };

    const handleOffline = () => setOnline(false);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (profile?.id) {
      carregarCompromissos();
    }
  }, [profile]);

  useEffect(() => {
    carregarDestaquesCalendarioApp();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    if (!profile.aceita_lembretes) return;
    if (!notificacaoAtiva) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    function verificarLembretes() {
      const agora = new Date();

      personalEvents.forEach((evento) => {
        if (!evento?.id) return;
        if (!evento?.data) return;
        if (!evento?.horario) return;
        if (!evento?.titulo) return;
        if (!evento?.lembrete || evento.lembrete === "sem_lembrete") return;

        const dataHoraCompromisso = getDataHoraCompromisso(evento);
        const dataHoraLembrete = getDataHoraLembrete(evento);

        if (!dataHoraCompromisso || !dataHoraLembrete) return;

        const chave = getChaveLembreteDisparado(evento, dataHoraLembrete);

        if (localStorage.getItem(chave) === "true") return;

        const lembreteJaChegou = agora >= dataHoraLembrete;
        const compromissoAindaNaoPassouMuito =
          agora.getTime() <= dataHoraCompromisso.getTime() + 2 * 60 * 60 * 1000;

        if (lembreteJaChegou && compromissoAindaNaoPassouMuito) {
          dispararNotificacaoCompromisso(evento);
          localStorage.setItem(chave, "true");
        }
      });
    }

    verificarLembretes();

    const intervalo = setInterval(verificarLembretes, 30 * 1000);

    return () => clearInterval(intervalo);
  }, [profile, personalEvents, notificacaoAtiva]);

  const carregarNotificacoesUsuarioApp = useCallback(async () => {
    if (!profile?.id) {
      setUserNotifications([]);
      setReadNotificationIds([]);
      return;
    }

    try {
      console.log("Carregando notificações...");
      const { notificacoes, leituras } = await listarNotificacoesUsuario(profile.id);
      const listaNotificacoes = notificacoes || [];
      const idsLidas = (leituras || []).map((item) => item.notification_id).filter(Boolean);
      const naoLidas = listaNotificacoes.filter((item) => !idsLidas.includes(item.id));

      setUserNotifications(listaNotificacoes);
      setReadNotificationIds(idsLidas);

      console.log("Notificações carregadas:", listaNotificacoes.length);
      console.log("Não lidas:", naoLidas.length);
    } catch (error) {
      console.error("Erro ao carregar notificações do usuário:", error);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) {
      setUserNotifications([]);
      setReadNotificationIds([]);
      return undefined;
    }

    carregarNotificacoesUsuarioApp();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        carregarNotificacoesUsuarioApp();
      }
    };

    const handleFocus = () => {
      carregarNotificacoesUsuarioApp();
    };

    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === "PIB2026_REFRESH_NOTIFICATIONS") {
        carregarNotificacoesUsuarioApp();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, [profile?.id, carregarNotificacoesUsuarioApp]);

  useEffect(() => {
    if (!profile?.id) return;
    if (!profile.aceita_lembretes) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    localStorage.setItem("calendario-pib-notificacao", "ativa");
    if (!notificacaoAtiva) {
      setNotificacaoAtiva(true);
    }

    registrarPushSubscription(profile).catch((error) => {
      console.error("Erro ao renovar push subscription:", error);
    });
  }, [profile?.id, profile?.aceita_lembretes, notificacaoAtiva]);

  async function marcarNotificacaoLida(notificationId) {
    try {
      await marcarNotificacaoComoLida(profile, notificationId);
      setReadNotificationIds((prev) =>
        prev.includes(notificationId) ? prev : [...prev, notificationId]
      );
      console.log("Notificação marcada como lida", notificationId);
      await carregarNotificacoesUsuarioApp();
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      alert("Não foi possível marcar a notificação como lida.");
    }
  }

  async function marcarTodasNotificacoesLidas() {
    try {
      const ids = userNotifications.map((item) => item.id);
      await marcarTodasNotificacoesComoLidas(profile, ids);
      setReadNotificationIds(ids);
      console.log("Todas as notificações marcadas como lidas");
      await carregarNotificacoesUsuarioApp();
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
      alert("Não foi possível marcar todas as notificações como lidas.");
    }
  }

  async function carregarDestaquesCalendarioApp() {
    try {
      const data = await listarDestaquesCalendario();
      setHighlightedDates(data || []);
    } catch (error) {
      console.error("Erro ao carregar destaques do calendário:", error);
    }
  }

  async function carregarCompromissos() {
    if (!profile?.id) return;

    try {
      const data = await listarCompromissos(profile);
      setPersonalEvents(data || []);
    } catch (error) {
      console.error(error);
    }
  }

  function getInstallInstructions() {
    const userAgent = window.navigator.userAgent.toLowerCase();

    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isWhatsApp = userAgent.includes("whatsapp") || userAgent.includes("wv");

    if (isWhatsApp && isAndroid) {
      return (
        "Você abriu o calendário dentro do WhatsApp.\n\n" +
        "Para instalar como aplicativo:\n\n" +
        "1. Toque nos três pontinhos no canto superior.\n" +
        "2. Escolha 'Abrir no Chrome' ou 'Abrir no navegador'.\n" +
        "3. No Chrome, toque nos três pontinhos novamente.\n" +
        "4. Escolha 'Instalar app' ou 'Adicionar à tela inicial'."
      );
    }

    if (isWhatsApp && isIOS) {
      return (
        "Você abriu o calendário dentro do WhatsApp.\n\n" +
        "Para instalar no iPhone:\n\n" +
        "1. Abra este link no Safari.\n" +
        "2. No Safari, toque no botão de compartilhar.\n" +
        "3. Escolha 'Adicionar à Tela de Início'.\n" +
        `4. Confirme o nome ${IGREJA.app}.`
      );
    }

    if (isIOS) {
      return (
        "Para instalar no iPhone:\n\n" +
        "1. Abra este link no Safari.\n" +
        "2. Toque no botão de compartilhar.\n" +
        "3. Escolha 'Adicionar à Tela de Início'.\n" +
        `4. Confirme o nome ${IGREJA.app}.`
      );
    }

    if (isAndroid) {
      return (
        "Para instalar no Android:\n\n" +
        "1. Abra este link no Chrome.\n" +
        "2. Toque nos três pontinhos no canto superior.\n" +
        "3. Escolha 'Instalar app' ou 'Adicionar à tela inicial'.\n" +
        "4. Confirme a instalação."
      );
    }

    return (
      "Para instalar o calendário:\n\n" +
      "Abra este link no navegador principal do aparelho e procure no menu a opção " +
      "'Instalar app' ou 'Adicionar à tela inicial'."
    );
  }

  function instalarApp() {
    if (installPrompt) {
      installPrompt.prompt();

      installPrompt.userChoice.then(() => {
        setInstallPrompt(null);
        localStorage.setItem("pib2026_install_intro_done", "true");
        setInstallIntroDone(true);
      });

      return;
    }

    alert(getInstallInstructions());
  }

  async function ativarLembretes() {
    if (!("Notification" in window)) {
      alert("Seu navegador não suporta notificações.");
      return false;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert(
        "As notificações não foram permitidas. Para receber lembretes, será necessário permitir notificações para este calendário."
      );
      return false;
    }

    localStorage.setItem("calendario-pib-notificacao", "ativa");
    setNotificacaoAtiva(true);

    let aparelhoRegistrado = false;

    try {
      aparelhoRegistrado = await registrarPushSubscription(profile);
    } catch (error) {
      console.error("Erro ao registrar push subscription:", error);
    }

    if (!aparelhoRegistrado) {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

      alert(
        isIOS && !isRunningAsPWA()
          ? "No iPhone, os avisos com o app fechado só funcionam com o calendário instalado na Tela de Início. Instale o calendário e ative os lembretes por lá."
          : "Os lembretes foram ativados, mas não conseguimos registrar este aparelho para receber avisos com o app fechado. Abra o calendário de novo mais tarde para tentarmos outra vez."
      );
    }

    try {
      await mostrarNotificacao("Lembretes ativados", {
        body: `Você poderá receber lembretes e avisos do ${IGREJA.app}.`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "pib2026-lembretes-ativados",
        data: { url: "/" }
      });
    } catch (error) {
      // A confirmação visual é opcional: um erro aqui não pode desfazer a ativação.
      console.error("Erro ao mostrar notificação de confirmação:", error);
    }

    return true;
  }

  async function alternarPreferenciaLembretes() {
    const novoValor = !profile.aceita_lembretes;

    const perfilAtualizado = {
      ...profile,
      aceita_lembretes: novoValor
    };

    try {
      if (novoValor) {
        const permitido = await ativarLembretes();

        if (!permitido) {
          return;
        }
      }

      if (isSupabaseConfigured && supabase) {
        await chamarFuncao("user", "update-reminders", {
          body: {
            profile_id: profile.id,
            email: profile.email,
            aceita_lembretes: novoValor
          }
        });
      }

      localStorage.setItem("pib2026_profile", JSON.stringify(perfilAtualizado));
      setProfile(perfilAtualizado);

      if (!novoValor) {
        localStorage.removeItem("calendario-pib-notificacao");
        setNotificacaoAtiva(false);
      }
    } catch (error) {
      console.error(error);

      localStorage.setItem("pib2026_profile", JSON.stringify(perfilAtualizado));
      setProfile(perfilAtualizado);

      alert(
        "A preferência foi alterada neste aparelho, mas não foi possível sincronizar com o banco agora. Verifique a conexão e tente novamente depois."
      );
    }
  }

  async function excluirMeuCompromisso(evento) {
    const confirmar = window.confirm(
      `Deseja excluir o compromisso "${evento.titulo}"?`
    );

    if (!confirmar) return;

    try {
      await excluirCompromissoPessoal(profile, evento.id);
      await carregarCompromissos();
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir o compromisso.");
    }
  }

  const mesOriginal = calendarData.find((item) => item.id === mesSelecionado);
  const mes = aplicarEventosFixosDeQuarta(mesOriginal);
  const tema = mes ? monthThemes[mes.mes] : monthThemes.Janeiro;
  const dataSelecionadaISO = getDataISO(mesSelecionado, diaSelecionado);

  const eventosIgrejaDoDia = useMemo(() => {
    if (!mes || !diaSelecionado) return [];
    return getEventosDoDia(mes, diaSelecionado);
  }, [mes, diaSelecionado]);

  const compromissosDoDia = useMemo(() => {
    return personalEvents.filter((event) => event.data === dataSelecionadaISO);
  }, [personalEvents, dataSelecionadaISO]);

  const destaqueDoDia = useMemo(() => {
    return highlightedDates.find((item) => item.data === dataSelecionadaISO) || null;
  }, [highlightedDates, dataSelecionadaISO]);

  const aniversarioDoDia = profile
    ? nascimentoBateComDia(profile.data_nascimento, mesSelecionado, diaSelecionado)
    : false;

  function mudarMes(direcao) {
    setMesSelecionado((mesAtual) => {
      const novoMes =
        direcao === "anterior"
          ? mesAtual === 1
            ? 12
            : mesAtual - 1
          : mesAtual === 12
            ? 1
            : mesAtual + 1;

      setDiaSelecionado(novoMes === mesAtualSistema ? diaAtualSistema : 1);

      return novoMes;
    });
  }

  if (checkingProfile) {
    return <main className="loading">Carregando...</main>;
  }

  if (!profile && !installIntroDone) {
    return (
      <InstallIntroScreen
        onInstall={instalarApp}
        onContinue={() => {
          localStorage.setItem("pib2026_install_intro_done", "true");
          setInstallIntroDone(true);
        }}
      />
    );
  }

  if (!profile) {
    return (
      <RegisterScreen
        onRegistered={setProfile}
        onInstall={instalarApp}
        canShowInstallButton={!isRunningAsPWA()}
      />
    );
  }

  if (viewAdmin) {
    return <AdminScreen profile={profile} onClose={() => setViewAdmin(false)} onHighlightsChanged={carregarDestaquesCalendarioApp} />;
  }

  if (!mes) {
    return <main className="loading">Carregando calendário...</main>;
  }

  const diasNoMes = getDiasDoMes(mesSelecionado);
  const primeiroDiaSemana = getPrimeiroDiaSemana(mesSelecionado);
  const diasVazios = Array.from({ length: primeiroDiaSemana });
  const dias = Array.from({ length: diasNoMes }, (_, index) => index + 1);
  const usuarioEhAdmin = isAdminProfile(profile);
  const notificacoesNaoLidas = userNotifications.filter(
    (item) => !readNotificationIds.includes(item.id)
  ).length;

  return (
    <main className={`app ${tema.className}`}>
      {showEventModal && (
        <EventModal
          profile={profile}
          selectedDate={dataSelecionadaISO}
          onClose={() => setShowEventModal(false)}
          onSaved={carregarCompromissos}
        />
      )}

      {showMyEventsModal && (
        <MyEventsModal
          events={personalEvents}
          onClose={() => setShowMyEventsModal(false)}
          onDelete={excluirMeuCompromisso}
        />
      )}

      {showNotificationsModal && (
        <UserNotificationsModal
          notifications={userNotifications}
          readIds={readNotificationIds}
          onClose={() => setShowNotificationsModal(false)}
          onMarkRead={marcarNotificacaoLida}
          onMarkAllRead={marcarTodasNotificacoesLidas}
        />
      )}

      <header className="officialHeader">
        <div className="officialHeaderText">
          <strong>{IGREJA.nome.toUpperCase()}</strong>
          <span>2026</span>
          <p>{IGREJA.lema.toUpperCase()}</p>
        </div>

        <div className="officialHeaderActions">
          {usuarioEhAdmin && (
            <button
              className="roundAction"
              onClick={() => setViewAdmin(true)}
              title="Admin"
            >
              <Shield size={18} />
            </button>
          )}

          <button
            className={`roundAction ${profile.aceita_lembretes ? "active" : ""}`}
            onClick={alternarPreferenciaLembretes}
            title={profile.aceita_lembretes ? "Desativar lembretes" : "Ativar lembretes"}
          >
            <Bell size={18} />
          </button>

          <button
            className="roundAction"
            onClick={() => setShowMyEventsModal(true)}
            title="Meus compromissos"
          >
            <User size={18} />
          </button>

          <button
            className={`roundAction notificationInboxButton ${notificacoesNaoLidas > 0 ? "hasUnread" : ""}`}
            onClick={() => {
              setShowNotificationsModal(true);
              carregarNotificacoesUsuarioApp();
            }}
            title="Notificações"
          >
            <BellRing size={18} />
            {notificacoesNaoLidas > 0 && <span>{notificacoesNaoLidas}</span>}
          </button>

          {!isRunningAsPWA() && (
            <button
              className="roundAction installHeaderButton"
              onClick={instalarApp}
              title="Instalar calendário"
            >
              <Download size={18} />
            </button>
          )}

          <div className={`connectionDot ${online ? "online" : "offline"}`}>
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
          </div>
        </div>
      </header>

      <section className="calendarPanel">
        <div className="calendarNav calendarNavSimple">
          <button onClick={() => mudarMes("anterior")} aria-label="Mês anterior">
            <ChevronLeft size={23} />
          </button>

          <div className="calendarMonthTitle">
            <h2>{mes.tema}</h2>
          </div>

          <button onClick={() => mudarMes("proximo")} aria-label="Próximo mês">
            <ChevronRight size={23} />
          </button>
        </div>

        <div className="weekRow">
          {weekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="daysGrid">
          {diasVazios.map((_, index) => (
            <div className="emptyDay" key={`empty-${index}`} />
          ))}

          {dias.map((dia) => {
            const eventosIgreja = getEventosDoDia(mes, dia);
            const dataISO = getDataISO(mesSelecionado, dia);
            const pessoais = personalEvents.filter((event) => event.data === dataISO);
            const aniversario = nascimentoBateComDia(
              profile.data_nascimento,
              mesSelecionado,
              dia
            );

            const temMarcacao =
              eventosIgreja.length > 0 || pessoais.length > 0 || aniversario;

            const destaqueCalendario = highlightedDates.find(
              (item) => item.data === dataISO
            );

            const selecionado = diaSelecionado === dia;
            const hoje = mesSelecionado === mesAtualSistema && dia === diaAtualSistema;

            return (
              <button
                key={dia}
                className={`dayButton ${temMarcacao ? "hasEvent" : ""} ${destaqueCalendario ? "specialSunday" : ""
                  } ${selecionado ? "selected" : ""} ${hoje ? "today" : ""}`}
                onClick={() => setDiaSelecionado(dia)}
              >
                <span>{dia}</span>

                {temMarcacao && (
                  <div className="eventDots">
                    {eventosIgreja.length > 0 && <i className="churchDot" />}
                    {pessoais.length > 0 && <i className="personalDot" />}
                    {aniversario && <i className="birthdayDot" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="selectedDayPanel">
        <div className="dragHandle" />

        <div className="selectedDayHeader">
          <div>
            <span>Data selecionada</span>
            <h3>
              {diaSelecionado} de {mes.mes}
            </h3>
          </div>

          <button
            className="floatingDate"
            onClick={() => setShowEventModal(true)}
            title="Adicionar compromisso pessoal"
          >
            <Plus size={18} />
            <span>{diaSelecionado}</span>
          </button>
        </div>

        {eventosIgrejaDoDia.length === 0 &&
          compromissosDoDia.length === 0 &&
          !aniversarioDoDia &&
          !destaqueDoDia ? (
          <div className="emptyState">
            <p>Nenhum evento para este dia.</p>
          </div>
        ) : (
          <div className="eventList">
            {destaqueDoDia && (
              <article className="eventCard highlightCard">
                <div className="eventColor" />

                <div>
                  <span>Destaque da igreja</span>
                  <h4>{destaqueDoDia.titulo}</h4>
                  <p>Esta data foi destacada pela administração do calendário.</p>
                </div>
              </article>
            )}

            {aniversarioDoDia && (
              <article className="eventCard birthdayCard">
                <div className="eventColor" />

                <div>
                  <span>Aniversário</span>
                  <h4>Seu aniversário</h4>
                  <p>{profile.nome_completo}, que Deus abençoe sua vida.</p>
                </div>
              </article>
            )}

            {eventosIgrejaDoDia.map((evento, index) => (
              <article className="eventCard" key={`igreja-${evento.titulo}-${index}`}>
                <div className="eventColor" />

                <div>
                  <span>{evento.categoria}</span>
                  <h4>{evento.titulo}</h4>
                  <p>{evento.horario || "O dia inteiro"}</p>
                </div>
              </article>
            ))}

            {compromissosDoDia.map((evento) => (
              <article className="eventCard personalCard" key={evento.id}>
                <div className="eventColor" />

                <div>
                  <span>Meu compromisso</span>
                  <h4>{evento.titulo}</h4>
                  <p>
                    {evento.horario || "Sem horário"}
                    {evento.lembrete !== "sem_lembrete" ? ` • ${evento.lembrete}` : ""}
                  </p>
                  {evento.observacao && <p>{evento.observacao}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="monthDefensePanel">
        <span>O que defendemos neste mês</span>
        <h3>{mes.defesa}</h3>
        <p>{mes.foco}</p>
      </section>

      <footer className="footer calendarFooterQuote">
        <p>“{mes.frase}”</p>
        <strong>{mes.referencia}</strong>
      </footer>
    </main>
  );
}