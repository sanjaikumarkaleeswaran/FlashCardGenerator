import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Network, Loader2, GitMerge } from 'lucide-react';
import { api } from '../services/api';

const MindMap = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const documentId = location.state?.documentId;

  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!documentId) navigate('/library');
    else fetchGraph();
  }, [documentId]);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/knowledge-graph', { document_id: documentId });
      setGraph(res.data.graph);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20 text-indigo-500">
        <Network className="w-16 h-16 animate-pulse mb-4" />
        <h2 className="text-xl font-bold">Mapping Concept Relations...</h2>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 h-full animate-fade-in flex flex-col">
      <div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
          Concept Map
        </h1>
        <p className="text-slate-500 mt-2">Visualizing relationships between key topics in the document.</p>
      </div>

      <div className="flex-1 min-h-[500px] bg-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl border border-slate-800">
        {/* Abstract Visualization of a MindMap since ReactFlow isn't installed */}
        {graph && graph.nodes && (
          <div className="absolute inset-0 flex flex-wrap items-center justify-center p-12 gap-8 overflow-auto content-center">
            {graph.edges?.map((edge, i) => (
              <div key={`edge-${i}`} className="hidden" /> 
            ))}
            {graph.nodes.map((node) => (
              <div key={node.id} className="relative group cursor-pointer hover:z-10 transition-transform hover:scale-110">
                <div className={`px-6 py-4 rounded-2xl border shadow-lg backdrop-blur-md flex items-center gap-3
                  ${node.type === 'core' 
                    ? 'bg-indigo-600/90 border-indigo-400 text-white shadow-indigo-500/50' 
                    : 'bg-slate-800/80 border-slate-600 text-slate-200'}`}>
                  <GitMerge className="w-5 h-5 opacity-70" />
                  <span className="font-bold whitespace-nowrap">{node.label}</span>
                </div>
                
                {node.description && (
                  <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-64 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl text-slate-800 dark:text-slate-200 text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-slate-200 dark:border-slate-700">
                    <p>{node.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMap;
