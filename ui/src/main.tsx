import { createRoot } from "react-dom/client";
import "./index.css";
import React from "react";
import { App } from "./app";

const container = document.getElementById("root")!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
