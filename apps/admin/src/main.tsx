import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@hungernet/auth";
import "../../../packages/styles/src/sites/index.css";
import "../../../packages/styles/src/sites/components/PrivateAuth.css";
import "./admin.css";
import "../../../packages/styles/src/sites/platform.css";
import { App } from "./App";

document.documentElement.dataset.site = "ifamished";
document.documentElement.dataset.theme =
  getComputedStyle(document.documentElement).getPropertyValue("--site-theme").trim() || "default";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider clientId="admin">
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
