import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const cleanPath = window.location.pathname.startsWith(`${basePath}/`)
  ? window.location.pathname.slice(basePath.length) || "/"
  : window.location.pathname;

if (!window.location.hash && cleanPath !== "/") {
  window.location.replace(`${basePath}/#${cleanPath}${window.location.search}`);
}

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
