import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";
import "./styles/index.scss";

// Rendu de l'application dans le conteneur racine
ReactDOM.render(
  <BrowserRouter>
    <React.StrictMode> {/* StrictMode aide à identifier les problèmes potentiels dans l'application */}
      <App />
    </React.StrictMode>
  </BrowserRouter>,
  document.getElementById("root")
);
