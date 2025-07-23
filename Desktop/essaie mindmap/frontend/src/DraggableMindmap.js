// DraggableMindmap.js
import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'react-flow-renderer';

const initialNodes = [
  {
    id: '1',
    data: { label: '🌱 Idée principale' },
    position: { x: 250, y: 5 },
    style: { background: '#f0f4c3', padding: 10, borderRadius: 10 },
  },
  {
    id: '2',
    data: { label: '📈 Analyse de marché' },
    position: { x: 100, y: 100 },
    style: { background: '#e3f2fd', padding: 10, borderRadius: 10 },
  },
  {
    id: '3',
    data: { label: '🚀 Plan de lancement' },
    position: { x: 400, y: 100 },
    style: { background: '#ffe0b2', padding: 10, borderRadius: 10 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
];

function DraggableMindmap() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  return (
    <div style={{ width: '100%', height: '90vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export default DraggableMindmap;
