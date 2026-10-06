import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "../../../packages/styles/src/legacy/styles/index.css";
import "../../../packages/styles/src/legacy/styles/themes/premium/galaxy.css";
import "./legacy/styles/background.css";
import "./legacy/styles/overrides.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </StrictMode>,
);
