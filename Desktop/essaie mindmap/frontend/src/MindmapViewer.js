// 📦 Importation des dépendances React et des composants React Flow
import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
} from 'react-flow-renderer';

import axios from 'axios';                         // 🔁 Requêtes HTTP vers l’API backend
import { toPng, toCanvas } from 'html-to-image';   // 📷 Pour exporter la mindmap en image
import jsPDF from 'jspdf';                         // 📄 Pour exporter en PDF
//Fonction utilitaire : formater le contenu de chaque section

const formatContent = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return `• ${item}`;
      return Object.entries(item)
        .map(([key, value]) => `• ${key} : ${value}`)
        .join('\n');
    }).join('\n');
  }
  if (typeof content === 'object') {
    return Object.entries(content).map(([k, v]) => `• ${k} : ${v}`).join('\n');
  }
  return String(content);
};

const MindmapViewer = ({ prompt }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editContent, setEditContent] = useState('');
  const reactFlowWrapper = useRef(null);

  const fetchMindmap = async () => {
    try {
      if (!prompt || typeof prompt !== 'string') {
        console.warn("⛔ Prompt invalide :", prompt);
        return;
      }

      const res = await axios.post("http://localhost:8000/generate-mindmap",
        { prompt },
        { headers: { "X-API-Key": "mon-api-secrete" } }
      );

      const data = res.data;
      const topic = data.topic;
      const sections = data.sections;

      const centerX = 400;
      const centerY = 300;
      const radius = 200;

      const rootNode = {
        id: 'root',
        data: { label: `${topic}\n(Double-cliquez pour éditer)` },
        position: { x: centerX, y: centerY },
        style: {
          background: '#f3e5f5',
          padding: 12,
          borderRadius: 12,
          width: 300,
          fontWeight: 'bold',
          border: '2px solid #ce93d8',
          lineHeight: '1.4'
        }
      };

      const childNodes = sections.map((section, index) => {
        const angle = (2 * Math.PI * index) / sections.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        return {
          id: `section-${index}`,
          data: {
            label: `${section.icon} ${section.title}\n${formatContent(section.content)}`
          },
          position: { x, y },
          style: {
            background: '#e3f2fd',
            padding: 12,
            borderRadius: 12,
            width: 280,
            whiteSpace: 'pre-wrap',
            border: '1px solid #90caf9',
            lineHeight: '1.4'
          }
        };
      });

      const edgeList = sections.map((_, index) => ({
        id: `e-root-${index}`,
        source: 'root',
        target: `section-${index}`,
        animated: true
      }));

      setNodes([rootNode, ...childNodes]);
      setEdges(edgeList);
    } catch (err) {
      console.error("Erreur de chargement:", err);
    }
  };

  useEffect(() => {
    fetchMindmap();
  }, [prompt]);
// Double-clic sur un nœud pour l’éditer
  const onNodeDoubleClick = useCallback((event, node) => {
    if (!editMode) return;
    setSelectedNode(node);
    const content = node.data.label.split('\n').slice(1).join('\n');
    setEditContent(content);
  }, [editMode]);
//Modification des positions ou contenus des nœuds
  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        axios.post("http://localhost:8000/save-nodes", {
          nodes: updated,
          prompt: prompt
        }, {
          headers: { "X-API-Key": "mon-api-secrete" }
        });
        return updated;
      });
    },
    [prompt]
  );
// Mise à jour des connexions
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const handleSaveEdit = () => {
    setNodes((prev) => {
      const updatedNodes = prev.map((n) =>
        n.id === selectedNode.id ? {
          ...n,
          data: {
            ...n.data,
            label: `${n.data.label.split('\n')[0]}\n${editContent}`
          }
        } : n
      );

      axios.post("http://localhost:8000/save-nodes", {
        nodes: updatedNodes,
        prompt: prompt
      }, {
        headers: { "X-API-Key": "mon-api-secrete" }
      });

      return updatedNodes;
    });

    setSelectedNode(null);
    setEditContent('');
  };

  const handleDownloadPNG = () => {
    toPng(reactFlowWrapper.current).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = 'mindmap.png';
      link.href = dataUrl;
      link.click();
    });
  };

  const handleDownloadPDF = () => {
    toCanvas(reactFlowWrapper.current).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0);
      pdf.save('mindmap.pdf');
    });
  };

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', padding: '20px' }}>
      <div style={{ padding: 10 }}>
        <button onClick={() => setEditMode(!editMode)} style={{ marginRight: 10 }}>
          {editMode ? '🔒 Quitter l\'édition' : '📝 Edit'}
        </button>
        <button onClick={handleDownloadPNG} style={{ marginRight: 10 }}>📷 Export PNG</button>
        <button onClick={handleDownloadPDF}>📄 Export PDF</button>
      </div>

      <div ref={reactFlowWrapper} style={{
        width: '100%',
        height: '85vh',
        background: '#ffffff',
        borderRadius: 12,
        padding: 20
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          nodesDraggable={editMode}
          onNodeDoubleClick={onNodeDoubleClick}
          style={{ backgroundColor: '#ffffff' }}
        >
          <Controls />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '30%',
          width: 400,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 20,
          zIndex: 999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <h3>Edit Node Content</h3>
          <textarea
            rows={5}
            style={{ width: '100%' }}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          /><br /><br />
          <button onClick={handleSaveEdit} style={{
            background: '#9c27b0',
            color: 'white',
            padding: '6px 12px',
            border: 'none',
            borderRadius: 4
          }}>Save</button>
          <button onClick={() => setSelectedNode(null)} style={{ marginLeft: 10 }}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default MindmapViewer;
