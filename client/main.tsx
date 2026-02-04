import "./global.css";
import { createRoot } from "react-dom/client";
import App from "./App";

// Set print date for print styling
document.body.setAttribute('data-print-date', new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
