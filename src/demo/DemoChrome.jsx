import { useEffect, useState } from "react";
import { DEMO_ADMIN_EMAIL, DEMO_MEMBRO_EMAIL, IGREJA, LYCHNOS } from "./config";
import { EVENTO_PUSH, restaurarBancoDemo } from "./backend";
import { entrarComoAdminDemo } from "../supabaseClient";
import "./demo.css";

const linkInteresse = `https://wa.me/${LYCHNOS.whatsapp}?text=${encodeURIComponent(LYCHNOS.mensagem)}`;

function entrarComo(email, admin) {
  const db = JSON.parse(localStorage.getItem("pibdemo_db") || "{}");
  const perfil = db.profiles?.find((p) => p.email === email);
  if (!perfil) return;
  localStorage.setItem("pib2026_profile", JSON.stringify(perfil));
  localStorage.setItem("pib2026_install_intro_done", "true");
  if (admin) {
    entrarComoAdminDemo();
    sessionStorage.setItem("pibdemo_abrir_admin", "1");
  }
  window.location.reload();
}

function trocarPerfil() {
  localStorage.removeItem("pib2026_profile");
  localStorage.removeItem("pibdemo_admin_session");
  window.location.reload();
}

function restaurar() {
  if (window.confirm("Restaurar os dados de exemplo? O que você cadastrou nesta demonstração será apagado.")) {
    restaurarBancoDemo();
    window.location.reload();
  }
}

// Faixa fixa no topo da demonstração.
export function DemoBar() {
  const logado = Boolean(localStorage.getItem("pib2026_profile"));
  return (
    <div className="demo-faixa">
      <span>
        <strong>Demonstração</strong>
        <span className="demo-faixa-longo"> com dados fictícios, salvos só neste navegador.</span>
      </span>
      <div className="demo-faixa-botoes">
        {logado && <button type="button" onClick={trocarPerfil}>Trocar<span className="demo-faixa-longo"> perfil</span></button>}
        <button type="button" onClick={restaurar}>Restaurar<span className="demo-faixa-longo"> dados</span></button>
        <a href={linkInteresse} target="_blank" rel="noopener noreferrer" className="demo-faixa-cta">
          Quero para minha igreja
        </a>
      </div>
    </div>
  );
}

// Botões de entrada rápida, mostrados na tela de acesso.
export function DemoEntrada() {
  return (
    <div className="demo-entrada">
      <p className="demo-entrada-titulo">Explore a demonstração</p>
      <button type="button" onClick={() => entrarComo(DEMO_MEMBRO_EMAIL, false)}>
        <strong>Entrar como membro</strong>
        <span>Calendário, compromissos pessoais com lembrete e avisos da igreja.</span>
      </button>
      <button type="button" onClick={() => entrarComo(DEMO_ADMIN_EMAIL, true)}>
        <strong>Entrar como administrador</strong>
        <span>Painel com cadastros, aniversariantes, destaques e envio de avisos.</span>
      </button>
      <p className="demo-entrada-ou">ou faça um cadastro de teste abaixo</p>
    </div>
  );
}

// Simula a chegada de uma notificação push quando o administrador envia um aviso.
export function DemoPush() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    function receber(e) {
      setAviso(e.detail);
      if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => reg.showNotification(e.detail.titulo, { body: e.detail.mensagem, icon: "/icon-192.png" }))
          .catch(() => {});
      }
    }
    window.addEventListener(EVENTO_PUSH, receber);
    return () => window.removeEventListener(EVENTO_PUSH, receber);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 7000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!aviso) return null;
  return (
    <div className="demo-push" role="status" onClick={() => setAviso(null)}>
      <img src="/icon-192.png" alt="" />
      <div>
        <p className="demo-push-app">{IGREJA.app} · agora</p>
        <p className="demo-push-titulo">{aviso.titulo}</p>
        <p className="demo-push-texto">{aviso.mensagem}</p>
        <p className="demo-push-nota">Simulação: no app real, este aviso chega no celular de cada membro, mesmo com o app fechado.</p>
      </div>
    </div>
  );
}
