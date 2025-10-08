import React, { useState, useMemo } from 'react';
import { VisualRoadmap, VisualRoadmapGenerator } from '@/lib/visualRoadmapGenerator';

interface RoadmapViewerProps { roadmap: VisualRoadmap; height?: number; }

// Minimal roadmap.sh style vertical grouped roadmap
export const RoadmapViewer: React.FC<RoadmapViewerProps> = ({ roadmap, height = 600 }) => {
  const model = useMemo(()=> VisualRoadmapGenerator.buildHierarchicalModel(roadmap), [roadmap]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setCollapsed(c => ({...c, [key]: !c[key]}));

  return (
    <div style={{border:'1px solid #e2e8f0', borderRadius:16, padding:24, background:'#fff', fontFamily:'Inter,Segoe UI,sans-serif', maxHeight: height, overflow:'auto'}}>
      <h2 style={{marginTop:0, fontSize:24, fontWeight:700}}>{roadmap.title}</h2>
      <p style={{color:'#64748b', marginTop:4}}>{roadmap.description}</p>
      {Object.entries(model.groups).map(([key, group]) => {
        if(!(group as any).items.length) return null;
        const isCollapsed = collapsed[key];
        return (
          <div key={key} style={{marginTop:24}}>
            <div style={{display:'flex', alignItems:'center', cursor:'pointer'}} onClick={()=>toggle(key)}>
              <div style={{width:14, height:14, border:'2px solid #6366f1', borderRadius:4, marginRight:8, background: isCollapsed? '#fff':'#6366f1'}} />
              <h3 style={{margin:0, fontSize:18}}>{(group as any).title} <span style={{fontSize:12, color:'#6366f1'}}>({(group as any).items.length})</span></h3>
            </div>
            {!isCollapsed && (
              <ul style={{listStyle:'none', paddingLeft:24, marginTop:12}}>
                {(group as any).items.map((n: any) => (
                  <li key={n.id} style={{marginBottom:14, position:'relative'}}>
                    <div style={{position:'absolute', left:-20, top:6, width:8, height:8, borderRadius:4, background: typeColor(n.type)}} />
                    <div style={{fontWeight:600}}>{n.title} <span style={{color:'#94a3b8', fontWeight:400}}>• {n.estimatedTime}</span></div>
                    <div style={{fontSize:13, color:'#475569', lineHeight:'1.4'}}>{truncate(n.description, 140)}</div>
                    <div style={{marginTop:4, display:'flex', flexWrap:'wrap', gap:6}}>
                      {n.skills.slice(0,4).map((s:string)=> <span key={s} style={{background:'#f1f5f9', border:'1px solid #e2e8f0', padding:'2px 8px', borderRadius:12, fontSize:11}}>{s}</span>)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

function truncate(text: string, max: number){ return text.length>max? text.slice(0,max-3)+'...': text; }
function typeColor(t: string){
  switch(t){ case 'prerequisite': return '#ef4444'; case 'core': return '#3b82f6'; case 'project': return '#10b981'; case 'advanced': return '#8b5cf6'; case 'milestone': return '#f59e0b'; default: return '#6366f1'; }
}

export default RoadmapViewer;