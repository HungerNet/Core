import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@hungernet/auth";
import "../../../packages/styles/src/sites/index.css";
import "./profile.css";
import "./accounts.css";
import "../../../packages/styles/src/sites/platform.css";
import { App } from "./App";

document.documentElement.dataset.site = "ifamished";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
