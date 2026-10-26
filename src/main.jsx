import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { garantirBancoDemo } from "./demo/backend";
import { DemoBar, DemoPush } from "./demo/DemoChrome";
import "./style.css";

// Na primeira visita, cria os dados de exemplo da demonstração.
garantirBancoDemo();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DemoBar />
    <DemoPush />
    <App />
  </React.StrictMode>
);

// O service worker só é registrado no site publicado. No computador (npm run dev),
// ele ficaria preso ao endereço localhost:5173 e abriria este app no lugar de outros projetos.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(console.error);
  });
}
