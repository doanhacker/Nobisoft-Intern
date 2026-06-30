import React from "react";
import { createRoot } from "react-dom/client";
import { Search, UploadCloud } from "lucide-react";
import "./styles.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  return (
    <main className="shell">
      <section className="workspace">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Visual Search Engine</p>
            <h1>Image search workspace</h1>
          </div>
          <a className="api-link" href={`${apiUrl}/docs`} target="_blank" rel="noreferrer">
            API Docs
          </a>
        </div>

        <div className="panels">
          <section className="panel">
            <UploadCloud aria-hidden="true" />
            <h2>Upload</h2>
            <p>Backend team can wire this panel to the image upload API.</p>
          </section>

          <section className="panel">
            <Search aria-hidden="true" />
            <h2>Search</h2>
            <p>Frontend and AI teams can connect query input, embeddings, and result ranking here.</p>
          </section>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
