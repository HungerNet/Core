import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@hungernet/auth";
import "@hungernet/styles";
import "./site.css";
import { App } from "./App";

document.documentElement.dataset.site = "hungernet";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider apiBaseUrl={import.meta.env.VITE_API_BASE_URL || "/api/v1"}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
