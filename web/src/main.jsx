import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";
import { ItemsProvider } from "./context/ItemsContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <ItemsProvider>
        <App />
      </ItemsProvider>
      <Toaster position="top-center" reverseOrder={false} />
    </AuthProvider>
  </BrowserRouter>
);
