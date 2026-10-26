# Calendário 2026 · Demonstração para igrejas

Versão de **demonstração** do calendário digital para igrejas desenvolvido pela Lychnos Tech.
A igreja ("Igreja Comunidade da Luz"), os membros, os avisos e os eventos são **fictícios**.

O app real está em uso por uma igreja e é privado. Esta cópia funciona **sem servidor**:
tudo fica salvo no navegador de quem testa, então nenhum dado sai do aparelho.

## O que dá para testar
- **Entrar como membro:** calendário anual com temas do mês, eventos da igreja, aniversariantes,
  compromissos pessoais com lembrete e a caixa de avisos (com marcação de lidos).
- **Entrar como administrador:** cadastros, envio e agendamento de avisos oficiais, permissões de
  aniversariantes e domingos em destaque.
- **Notificações simuladas:** ao enviar um aviso pelo painel, ele aparece na tela como uma notificação
  de celular. No app real, ele chega a cada membro por notificação push, mesmo com o app fechado.
- A faixa no topo permite **trocar de perfil** e **restaurar os dados de exemplo**.

## Como funciona por dentro
- `src/demo/backend.js` responde às mesmas ações das Edge Functions do app real, usando o LocalStorage.
- `src/supabaseClient.js` é um cliente falso que só imita a sessão do administrador.
- `src/demo/seed.js` cria os dados de exemplo; `src/data/calendarData.js` traz o calendário fictício.
- O service worker só é registrado no site publicado (não no `npm run dev`).

## Como executar
```bash
npm install
npm run dev
```

## Publicação
Importe o repositório na Vercel (Framework: Vite). Não é preciso configurar variáveis de ambiente.

## Tecnologias
React, Vite, PWA (service worker e manifest), lucide-react. No app real: Supabase, Edge Functions,
pg_cron e Web Push.
