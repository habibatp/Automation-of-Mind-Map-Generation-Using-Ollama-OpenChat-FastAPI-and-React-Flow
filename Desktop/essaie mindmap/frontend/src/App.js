import React, { useState } from 'react';
import MindmapViewer from './MindmapViewer'; // ✅ utilise MindmapViewer.js

function App() {
  const [prompt, setPrompt] = useState("Créer une app de livraison des sacs");
  const [start, setStart] = useState(false);

  return (
    <div style={{ padding: 20 }}>
      {!start && (
        <>
          <h2>🧠 Générateur de Mindmap</h2>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ padding: 10, width: '60%' }}
          />
          <button
            onClick={() => setStart(true)}
            style={{ padding: 10, marginLeft: 10 }}
          >
            Générer
          </button>
        </>
      )}

      {/* 🔄 Utilise MindmapViewer avec le prompt */}
      {start && <MindmapViewer prompt={prompt} />}
    </div>
  );
}

export default App;
