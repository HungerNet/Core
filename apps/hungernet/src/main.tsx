import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@hungernet/auth";
import "../../../packages/styles/src/legacy/styles/index.css";
import "../../../packages/styles/src/legacy/styles/themes/premium/aurora.css";
import "./legacy/styles/background.css";
import "./legacy/styles/overrides.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"} clientId="hungernet">
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
