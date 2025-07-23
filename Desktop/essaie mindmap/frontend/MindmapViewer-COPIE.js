// MindmapViewer.js avec édition stylée par nœud + déplacement activé + double-clic pour éditer

import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, { Controls, Background } from 'react-flow-renderer';
import axios from 'axios';
import { toPng, toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

const MindmapViewer = ({ prompt }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editContent, setEditContent] = useState('');
  const reactFlowWrapper = useRef(null);

  useEffect(() => {
    const fetchMindmap = async () => {
      try {
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
          draggable: editMode,
          style: { background: '#f3e5f5', padding: 12, borderRadius: 12, width: 300, fontWeight: 'bold', border: '2px solid #ce93d8' }
        };

        const childNodes = sections.map((section, index) => {
          const angle = (2 * Math.PI * index) / sections.length;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          return {
            id: `section-${index}`,
            data: { label: `${section.icon} ${section.title}\n${section.content}` },
            position: { x, y },
            draggable: editMode,
            style: {
              background: '#e3f2fd',
              padding: 12,
              borderRadius: 12,
              width: 280,
              whiteSpace: 'pre-wrap',
              border: '1px solid #90caf9'
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

    fetchMindmap();
  }, [prompt, editMode]);

  const onNodeDoubleClick = useCallback((event, node) => {
    if (!editMode) return;
    setSelectedNode(node);
    const content = node.data.label.split('\n').slice(1).join('\n');
    setEditContent(content);
  }, [editMode]);

  const handleSaveEdit = () => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNode.id ? {
          ...n,
          data: {
            ...n.data,
            label: `${n.data.label.split('\n')[0]}\n${editContent}`
          }
        } : n
      )
    );
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
    <div>
      <div style={{ padding: 10 }}>
        <button onClick={() => setEditMode(!editMode)} style={{ marginRight: 10 }}>
          {editMode ? '🔒 Quitter l\'édition' : '📝 Edit' }
        </button>
        <button onClick={handleDownloadPNG} style={{ marginRight: 10 }}>📷 Export PNG</button>
        <button onClick={handleDownloadPDF}>📄 Export PDF</button>
      </div>

      <div ref={reactFlowWrapper} style={{ width: '100%', height: '85vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={editMode}
          onNodeDoubleClick={onNodeDoubleClick}
        >
          <Background />
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
          zIndex: 999
        }}>
          <h3>Edit Node Content</h3>
          <textarea
            rows={5}
            style={{ width: '100%' }}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          /><br /><br />
          <button onClick={handleSaveEdit} style={{ background: '#9c27b0', color: 'white', padding: '6px 12px', border: 'none', borderRadius: 4 }}>Save</button>
          <button onClick={() => setSelectedNode(null)} style={{ marginLeft: 10 }}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default MindmapViewer;
