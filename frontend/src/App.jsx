import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = import.meta.env.VITE_API_URL || "";
const AREAS = ["Análisis Político","Economía","Seguridad","Legislación","Internacional","General"];
const TAGS = ["Educación","Seguridad","Economía","Agro","Pensiones","Salud","Política Exterior","Trabajo","Medioambiente","Tecnología","Corrupción"];
const TAG_COLORS = {"Educación":"#6366f1","Seguridad":"#ef4444","Economía":"#f59e0b","Agro":"#22c55e","Pensiones":"#8b5cf6","Salud":"#06b6d4","Política Exterior":"#3b82f6","Trabajo":"#f97316","Medioambiente":"#10b981","Tecnología":"#0ea5e9","Corrupción":"#dc2626"};
const AV_COLORS = ["#7c3aed","#3b82f6","#14b8a6","#f43f5e","#f59e0b","#6366f1"];
const EMOJIS = ["👤","👩‍💻","👨‍💻","🧑‍💼","👩‍🔬","🧑‍🎨","🦸","🧑‍🏫","📣","💼","🎨","🚀","⭐","🦊","🧑‍🔧"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DISCLAIMER = "Las opiniones expresadas son personales y no representan la posición de La Carreta de Leyes.";

const getWeekDate = () => {
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split("T")[0];
};
const weekLabel = d => {
  const date = new Date(d+"T12:00:00");
  const start = new Date(date); start.setDate(date.getDate()-date.getDay()+1);
  const end = new Date(start); end.setDate(start.getDate()+6);
  return `${start.getDate()}/${start.getMonth()+1} – ${end.getDate()}/${end.getMonth()+1}/${end.getFullYear()}`;
};
const cidx = u => u ? (u.id-1) % AV_COLORS.length : 0;
const emptyEntry = () => ({id:Date.now()+"_"+Math.random().toString(36).slice(2),titular:"",resumen:"",actoresClave:"",conclusion:"",fuentes:[""],tags:[]});
const api = (path, opts) => fetch(API+path,{headers:{"Content-Type":"application/json"},...opts}).then(r=>r.json());

// ── STYLES ─────────────────────────────────────────────────────────
const s = {
  page: {minHeight:"100vh",background:"#f8fafc",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"},
  bgGradient: {minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"},
  card: {background:"rgba(255,255,255,0.1)",backdropFilter:"blur(10px)",borderRadius:"1rem",padding:"1.5rem",border:"1px solid rgba(255,255,255,0.15)"},
  cardWhite: {background:"#fff",borderRadius:"1rem",padding:"1.25rem",border:"1px solid #e2e8f0",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"},
  btn: (bg,color="#fff")=>({background:bg,color,border:"none",borderRadius:"0.75rem",padding:"0.625rem 1.25rem",fontWeight:600,fontSize:"0.875rem",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:"0.5rem"}),
  btnOutline: {background:"#fff",color:"#475569",border:"1px solid #e2e8f0",borderRadius:"0.75rem",padding:"0.625rem 1.25rem",fontWeight:600,fontSize:"0.875rem",cursor:"pointer"},
  input: (err)=>({width:"100%",background:"rgba(255,255,255,0.1)",border:err?"2px solid #f87171":"1px solid rgba(255,255,255,0.2)",borderRadius:"0.75rem",padding:"0.75rem 1rem",color:"#fff",fontSize:"0.875rem",outline:"none",boxSizing:"border-box"}),
  inputWhite: {width:"100%",border:"1px solid #e2e8f0",borderRadius:"0.75rem",padding:"0.625rem 1rem",fontSize:"0.875rem",outline:"none",boxSizing:"border-box"},
  textarea: {width:"100%",border:"1px solid #e2e8f0",borderRadius:"0.75rem",padding:"0.625rem 1rem",fontSize:"0.875rem",outline:"none",resize:"none",boxSizing:"border-box",fontFamily:"inherit"},
  select: {width:"100%",border:"1px solid #e2e8f0",borderRadius:"0.75rem",padding:"0.625rem 1rem",fontSize:"0.875rem",outline:"none",background:"#fff",boxSizing:"border-box"},
  selectDark: {width:"100%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"0.75rem",padding:"0.75rem 1rem",color:"#fff",fontSize:"0.875rem",outline:"none",boxSizing:"border-box"},
  label: {fontSize:"0.75rem",fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"0.5rem"},
  labelDark: {fontSize:"0.75rem",fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"0.5rem"},
  header: {background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"1rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20},
  tag: (color)=>({background:color||"#6b7280",color:"#fff",borderRadius:"9999px",padding:"0.125rem 0.625rem",fontSize:"0.75rem",fontWeight:600,display:"inline-flex"}),
  avatar: (color)=>({width:"2.5rem",height:"2.5rem",borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.25rem",flexShrink:0}),
  toast: (type)=>({position:"fixed",top:"1rem",left:"50%",transform:"translateX(-50%)",zIndex:50,padding:"0.75rem 1.25rem",borderRadius:"0.75rem",background:type==="error"?"#ef4444":"#10b981",color:"#fff",fontWeight:600,fontSize:"0.875rem",boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}),
  modal: {position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"},
  grid4: {display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"1rem"},
};

// ── COMPONENTS ─────────────────────────────────────────────────────
const TagBadge = ({tag}) => <span style={s.tag(TAG_COLORS[tag])}>{tag}</span>;

const Avatar = ({user,size=40}) => (
  <div style={{...s.avatar(AV_COLORS[cidx(user)]),width:size,height:size,fontSize:size*0.5}}>{user?.emoji||"👤"}</div>
);

const Toast = ({toast}) => toast ? <div style={s.toast(toast.type)}>{toast.msg}</div> : null;

const Spinner = () => (
  <span style={{display:"inline-block",width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
);

const EntryCard = ({entry,idx}) => (
  <div style={{border:"1px solid #e2e8f0",borderRadius:"0.75rem",padding:"1rem",background:"#fff"}}>
    <div style={{fontWeight:700,color:"#1e293b",fontSize:"0.875rem",marginBottom:"0.5rem"}}>
      <span style={{color:"#94a3b8",marginRight:"0.25rem"}}>#{idx+1}</span>{entry.titular}
    </div>
    {entry.tags?.length>0 && (
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.25rem",marginBottom:"0.75rem"}}>
        {entry.tags.map(t=><TagBadge key={t} tag={t}/>)}
      </div>
    )}
    <div style={{fontSize:"0.875rem",display:"flex",flexDirection:"column",gap:"0.375rem"}}>
      {entry.resumen&&<div><span style={{fontWeight:600,color:"#64748b"}}>Resumen: </span><span style={{color:"#475569"}}>{entry.resumen}</span></div>}
      {entry.actoresClave&&<div><span style={{fontWeight:600,color:"#64748b"}}>Actores: </span><span style={{color:"#475569"}}>{entry.actoresClave}</span></div>}
      {entry.conclusion&&<div><span style={{fontWeight:600,color:"#64748b"}}>Conclusión: </span><span style={{color:"#475569"}}>{entry.conclusion}</span></div>}
      {entry.fuentes?.filter(f=>f).length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginTop:"0.25rem"}}>
          {entry.fuentes.filter(f=>f).map((f,i)=>(
            <a key={i} href={f} target="_blank" rel="noreferrer" style={{color:"#7c3aed",fontSize:"0.75rem",textDecoration:"none"}}>
              🔗 {f.replace(/https?:\/\//,"").slice(0,40)}{f.length>50?"...":""}
            </a>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ── ADMIN TABS ─────────────────────────────────────────────────────
function AdminWhatsApp({reports}) {
  const [selWeek,setSelWeek]=useState("");
  const [waMsg,setWaMsg]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [copied,setCopied]=useState(false);
  const weeks=[...new Set(reports.map(r=>r.week_date))].sort().reverse();
  const weekReports=selWeek?reports.filter(r=>r.week_date===selWeek):[];

  const generate=async()=>{
    setLoading(true);setWaMsg("");setError(null);
    try{
      const data=await api("/api/generate-whatsapp",{method:"POST",body:JSON.stringify({reports:weekReports})});
      if(data.message)setWaMsg(data.message);
      else setError(data.error||"Error al generar.");
    }catch{setError("Error de conexión.");}
    setLoading(false);
  };
  const copy=()=>{navigator.clipboard.writeText(waMsg);setCopied(true);setTimeout(()=>setCopied(false),2000);};

  return (
    <div style={s.cardWhite}>
      <div style={{marginBottom:"1rem"}}>
        <h3 style={{fontWeight:700,color:"#1e293b",margin:0}}>📱 Generar Mensaje para WhatsApp</h3>
        <p style={{color:"#94a3b8",fontSize:"0.875rem",margin:"0.25rem 0 0"}}>Resumen ejecutivo listo para compartir</p>
      </div>
      <div style={{display:"flex",gap:"0.75rem",marginBottom:"1rem",flexWrap:"wrap"}}>
        <select value={selWeek} onChange={e=>{setSelWeek(e.target.value);setWaMsg("");}} style={{...s.select,flex:1}}>
          <option value="">-- Selecciona semana --</option>
          {weeks.map(w=><option key={w} value={w}>Semana {weekLabel(w)} · {reports.filter(r=>r.week_date===w).length} reportes</option>)}
        </select>
        <button onClick={generate} disabled={!selWeek||loading} style={s.btn(!selWeek||loading?"#e2e8f0":"#7c3aed",!selWeek||loading?"#94a3b8":"#fff")}>
          {loading?<><Spinner/>Generando...</>:waMsg?"🔄 Regenerar":"🤖 Generar"}
        </button>
      </div>
      {!waMsg&&!loading&&selWeek&&<div style={{border:"2px dashed #e2e8f0",borderRadius:"0.75rem",padding:"2rem",textAlign:"center",color:"#94a3b8",fontSize:"0.875rem"}}>Haz clic en "Generar" para crear el mensaje.</div>}
      {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"0.75rem",padding:"1rem",color:"#dc2626",fontSize:"0.875rem"}}>{error}</div>}
      {waMsg&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
            <span style={{fontSize:"0.875rem",fontWeight:600,color:"#475569"}}>Vista previa</span>
            <button onClick={copy} style={s.btn(copied?"#d1fae5":"#f1f5f9",copied?"#065f46":"#475569")}>{copied?"✓ Copiado!":"📋 Copiar"}</button>
          </div>
          <div style={{background:"#ECE5DD",borderRadius:"1rem",padding:"1rem",fontSize:"0.875rem",color:"#1e293b",whiteSpace:"pre-wrap",lineHeight:1.6,maxHeight:"28rem",overflowY:"auto"}}>{waMsg}</div>
        </div>
      )}
    </div>
  );
}

function AdminTemas({reports,onRetagged}) {
  const [loading,setLoading]=useState(false);
  const [selTag,setSelTag]=useState(null);
  const allEntries=reports.flatMap(r=>r.entries.map(e=>({...e,reporterName:r.user_name})));
  const untagged=allEntries.filter(e=>!e.tags||e.tags.length===0).length;

  const tagAll=async()=>{
    setLoading(true);
    try{await api("/api/tag-entries",{method:"POST",body:JSON.stringify({entries:allEntries})});onRetagged();}
    catch(e){console.error(e);}
    setLoading(false);
  };

  const byTag={};TAGS.forEach(t=>{byTag[t]=[];});
  allEntries.forEach(e=>(e.tags||[]).forEach(t=>{if(byTag[t])byTag[t].push(e);}));
  const usedTags=TAGS.filter(t=>byTag[t].length>0);

  return (
    <div style={s.cardWhite}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",flexWrap:"wrap",gap:"0.75rem"}}>
        <div>
          <h3 style={{fontWeight:700,color:"#1e293b",margin:0}}>🏷️ Entradas por Tema</h3>
          <p style={{color:"#94a3b8",fontSize:"0.875rem",margin:"0.25rem 0 0"}}>{untagged>0?`${untagged} sin etiquetar`:"✅ Todas etiquetadas"}</p>
        </div>
        <button onClick={tagAll} disabled={loading||untagged===0} style={s.btn(loading||untagged===0?"#e2e8f0":"#7c3aed",loading||untagged===0?"#94a3b8":"#fff")}>
          {loading?<><Spinner/>Etiquetando...</>:"🤖 Etiquetar con IA"}
        </button>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1rem"}}>
        <button onClick={()=>setSelTag(null)} style={s.btn(selTag===null?"#1e293b":"#f1f5f9",selTag===null?"#fff":"#475569")} >Todos</button>
        {usedTags.map(t=>(
          <button key={t} onClick={()=>setSelTag(selTag===t?null:t)} style={{...s.btn(selTag===t?TAG_COLORS[t]:"#94a3b8")}}>
            {t} ({byTag[t].length})
          </button>
        ))}
      </div>
      {usedTags.length===0
        ?<div style={{border:"2px dashed #e2e8f0",borderRadius:"0.75rem",padding:"2rem",textAlign:"center",color:"#94a3b8",fontSize:"0.875rem"}}><div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏷️</div>Haz clic en "Etiquetar con IA".</div>
        :<div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          {(selTag?[selTag]:usedTags).map(tag=>(
            <div key={tag}>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.5rem"}}>
                <TagBadge tag={tag}/><span style={{fontSize:"0.75rem",color:"#94a3b8"}}>{byTag[tag].length} entrada{byTag[tag].length!==1?"s":""}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                {byTag[tag].map(e=>(
                  <div key={e.id} style={{background:"#f8fafc",borderRadius:"0.75rem",padding:"0.75rem"}}>
                    <div style={{fontWeight:600,color:"#334155",fontSize:"0.875rem"}}>{e.titular}</div>
                    <div style={{fontSize:"0.75rem",color:"#94a3b8",marginTop:"0.25rem"}}>Por {e.reporterName}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

function AdminTendencias({reports}) {
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const year=new Date().getFullYear();
  const monthReports=reports.filter(r=>{const d=new Date(r.week_date+"T12:00:00");return d.getMonth()+1===month&&d.getFullYear()===year;});
  const freq={};TAGS.forEach(t=>{freq[t]=0;});
  monthReports.forEach(r=>r.entries.forEach(e=>(e.tags||[]).forEach(t=>{if(freq[t]!==undefined)freq[t]++;})));
  const chartData=TAGS.map(t=>({tag:t,count:freq[t]})).filter(d=>d.count>0).sort((a,b)=>b.count-a.count);
  const total=chartData.reduce((s,d)=>s+d.count,0);

  return (
    <div style={s.cardWhite}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem",flexWrap:"wrap",gap:"0.75rem"}}>
        <div>
          <h3 style={{fontWeight:700,color:"#1e293b",margin:0}}>📈 Agenda Política Mensual</h3>
          <p style={{color:"#94a3b8",fontSize:"0.875rem",margin:"0.25rem 0 0"}}>Frecuencia de temas</p>
        </div>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))} style={{...s.select,width:"auto"}}>
          {MONTHS.map((m,i)=><option key={i} value={i+1}>{m} {year}</option>)}
        </select>
      </div>
      {chartData.length===0
        ?<div style={{border:"2px dashed #e2e8f0",borderRadius:"0.75rem",padding:"2rem",textAlign:"center",color:"#94a3b8",fontSize:"0.875rem"}}><div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📊</div>No hay datos en {MONTHS[month-1]}. Etiqueta primero.</div>
        :<>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{top:5,right:10,left:-20,bottom:65}}>
              <XAxis dataKey="tag" tick={{fontSize:10}} angle={-40} textAnchor="end" interval={0}/>
              <YAxis tick={{fontSize:11}} allowDecimals={false}/>
              <Tooltip formatter={(v,_,p)=>[`${v} entradas (${Math.round(v/total*100)}%)`,p.payload.tag]}/>
              <Bar dataKey="count" radius={[6,6,0,0]}>{chartData.map((d,i)=><Cell key={i} fill={TAG_COLORS[d.tag]||"#6b7280"}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0.5rem",marginTop:"0.75rem"}}>
            {chartData.map(d=>(
              <div key={d.tag} style={{display:"flex",alignItems:"center",gap:"0.5rem",background:"#f8fafc",borderRadius:"0.5rem",padding:"0.5rem"}}>
                <div style={{width:12,height:12,borderRadius:"50%",background:TAG_COLORS[d.tag]||"#6b7280",flexShrink:0}}/>
                <span style={{fontSize:"0.75rem",color:"#475569",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.tag}</span>
                <span style={{fontSize:"0.75rem",fontWeight:700,color:"#1e293b"}}>{d.count}</span>
                <span style={{fontSize:"0.75rem",color:"#94a3b8"}}>{Math.round(d.count/total*100)}%</span>
              </div>
            ))}
          </div>
        </>
      }
    </div>
  );
}

// ── EMPLOYEE ────────────────────────────────────────────────────────
function EmpleadoScreen({currentUser,onLogout}) {
  const [reports,setReports]=useState([]);
  const [view,setView]=useState("form");
  const [entries,setEntries]=useState([emptyEntry()]);
  const [submitting,setSubmitting]=useState(false);
  const [toast,setToast]=useState(null);
  const TODAY=getWeekDate();

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{api("/api/reports").then(d=>setReports(d.filter(r=>r.user_id===currentUser.id)));},[]);

  const addEntry=()=>setEntries(p=>[...p,emptyEntry()]);
  const removeEntry=id=>{if(entries.length===1)return;setEntries(p=>p.filter(e=>e.id!==id));};
  const upEntry=(id,field,val)=>setEntries(p=>p.map(e=>e.id===id?{...e,[field]:val}:e));
  const addFuente=id=>setEntries(p=>p.map(e=>e.id===id?{...e,fuentes:[...e.fuentes,""]}:e));
  const upFuente=(id,fi,val)=>setEntries(p=>p.map(e=>e.id===id?{...e,fuentes:e.fuentes.map((f,i)=>i===fi?val:f)}:e));
  const delFuente=(id,fi)=>setEntries(p=>p.map(e=>e.id===id?{...e,fuentes:e.fuentes.filter((_,i)=>i!==fi)}:e));

  const submit=async()=>{
    if(entries.some(e=>!e.titular.trim())){showToast("Cada entrada necesita un titular.","error");return;}
    setSubmitting(true);
    const sentAt=new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"});
    try{
      await api("/api/reports",{method:"POST",body:JSON.stringify({userId:currentUser.id,userName:currentUser.name,userArea:currentUser.area,weekDate:TODAY,submittedAt:sentAt,entries})});
      const updated=await api("/api/reports");
      setReports(updated.filter(r=>r.user_id===currentUser.id));
      setView("history");showToast("¡Reporte enviado!");
    }catch{showToast("Error al enviar.","error");}
    setSubmitting(false);
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus,textarea:focus,select:focus{border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,0.15)}`}</style>
      <Toast toast={toast}/>
      <header style={s.header}>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <div style={{width:32,height:32,background:"#7c3aed",borderRadius:"0.5rem",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>⚖️</div>
          <span style={{fontWeight:700,color:"#1e293b"}}>La Carreta de Leyes</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <Avatar user={currentUser} size={32}/>
          <span style={{fontSize:"0.875rem",fontWeight:500,color:"#334155"}}>{currentUser.name}</span>
          <button onClick={onLogout} style={s.btnOutline}>Salir</button>
        </div>
      </header>

      <div style={{maxWidth:720,margin:"0 auto",padding:"1.5rem"}}>
        <div style={{marginBottom:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <h2 style={{fontSize:"1.5rem",fontWeight:700,color:"#1e293b",margin:0}}>Monitoreo Político Semanal</h2>
            <p style={{color:"#64748b",margin:"0.25rem 0 0",fontSize:"0.875rem"}}>Semana del {weekLabel(TODAY)}</p>
          </div>
          <div style={{display:"flex",gap:"0.5rem"}}>
            {["form","history"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={s.btn(view===v?"#7c3aed":"#fff",view===v?"#fff":"#475569")}>
                {v==="form"?"✏️ Nuevo":"📋 Mis reportes"}
              </button>
            ))}
          </div>
        </div>

        {view==="form"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div style={{...s.cardWhite,display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <Avatar user={currentUser} size={40}/>
              <div>
                <div style={{fontWeight:600,color:"#1e293b"}}>{currentUser.name}</div>
                <div style={{fontSize:"0.8rem",color:"#94a3b8"}}>{currentUser.area} · Semana del {weekLabel(TODAY)}</div>
              </div>
            </div>

            {entries.map((entry,idx)=>(
              <div key={entry.id} style={s.cardWhite}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                  <span style={{fontWeight:700,color:"#334155",fontSize:"0.875rem"}}>📌 Noticia #{idx+1}</span>
                  {entries.length>1&&<button onClick={()=>removeEntry(entry.id)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:"0.8rem"}}>✕ Eliminar</button>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                  {[
                    {key:"titular",label:"Titular — Idea Principal",ph:"La noticia o hecho político más relevante...",rows:1,req:true},
                    {key:"resumen",label:"Resumen — Ideas secundarias",ph:"Contexto y detalles que complementan el titular...",rows:3},
                    {key:"actoresClave",label:"Actores Clave",ph:"Ministerios, partidos, instituciones, personas...",rows:1},
                    {key:"conclusion",label:"Conclusión — Análisis",ph:"¿Qué implica esto? ¿Cuál es el impacto esperado?",rows:3},
                  ].map(({key,label,ph,rows,req})=>(
                    <div key={key}>
                      <label style={{fontSize:"0.8rem",fontWeight:600,color:"#475569",display:"block",marginBottom:"0.375rem"}}>{label}{req&&<span style={{color:"#ef4444",marginLeft:4}}>*</span>}</label>
                      {rows===1
                        ?<input value={entry[key]} onChange={e=>upEntry(entry.id,key,e.target.value)} placeholder={ph} style={s.inputWhite}/>
                        :<textarea rows={rows} value={entry[key]} onChange={e=>upEntry(entry.id,key,e.target.value)} placeholder={ph} style={s.textarea}/>
                      }
                    </div>
                  ))}
                  <div>
                    <label style={{fontSize:"0.8rem",fontWeight:600,color:"#475569",display:"block",marginBottom:"0.375rem"}}>Fuentes</label>
                    {entry.fuentes.map((f,fi)=>(
                      <div key={fi} style={{display:"flex",gap:"0.5rem",marginBottom:"0.5rem"}}>
                        <input value={f} onChange={e=>upFuente(entry.id,fi,e.target.value)} placeholder="https://..." style={{...s.inputWhite,flex:1}}/>
                        {entry.fuentes.length>1&&<button onClick={()=>delFuente(entry.id,fi)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:"1.25rem",padding:"0 0.25rem"}}>✕</button>}
                      </div>
                    ))}
                    <button onClick={()=>addFuente(entry.id)} style={{background:"none",border:"none",color:"#7c3aed",cursor:"pointer",fontSize:"0.8rem",fontWeight:600,padding:0}}>+ Agregar fuente</button>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addEntry} style={{width:"100%",border:"2px dashed #e2e8f0",borderRadius:"1rem",padding:"1rem",background:"none",color:"#94a3b8",cursor:"pointer",fontSize:"0.875rem",fontWeight:500}}>+ Agregar otra noticia</button>
            <button onClick={submit} disabled={submitting} style={{...s.btn(submitting?"#c4b5fd":"#7c3aed"),width:"100%",justifyContent:"center",padding:"0.875rem"}}>
              {submitting?<><Spinner/>Enviando...</>:"Enviar Reporte"}
            </button>
          </div>
        )}

        {view==="history"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            {reports.length===0
              ?<div style={{...s.cardWhite,textAlign:"center",padding:"3rem",color:"#94a3b8"}}><div style={{fontSize:"3rem",marginBottom:"0.5rem"}}>📭</div><p>Aún no has enviado reportes.</p></div>
              :reports.sort((a,b)=>b.id-a.id).map(r=>(
                <div key={r.id} style={s.cardWhite}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem"}}>
                    <div style={{width:36,height:36,background:"#d1fae5",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>✅</div>
                    <div>
                      <div style={{fontWeight:600,color:"#1e293b"}}>Semana del {weekLabel(r.week_date)}</div>
                      <div style={{fontSize:"0.75rem",color:"#94a3b8"}}>{r.entries.length} entrada{r.entries.length!==1?"s":""} · {r.submitted_at}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>{r.entries.map((e,i)=><EntryCard key={e.id} entry={e} idx={i}/>)}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("welcome");
  const [currentUser,setCurrentUser]=useState(null);
  const [welcomeTab,setWelcomeTab]=useState("volunteer");
  const [draft,setDraft]=useState({name:"",area:AREAS[0],emoji:"👤"});
  const [adminPwd,setAdminPwd]=useState("");
  const [adminError,setAdminError]=useState(false);
  const [volunteerError,setVolunteerError]=useState(false);
  const [adminTab,setAdminTab]=useState("whatsapp");
  const [reports,setReports]=useState([]);
  const [users,setUsers]=useState([]);
  const [toast,setToast]=useState(null);
  const [deleteConfirm,setDeleteConfirm]=useState(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};
  const TODAY=getWeekDate();
  const loadReports=()=>api("/api/reports").then(setReports);
  const loadUsers=()=>api("/api/users").then(d=>setUsers(d.filter(u=>u.role==="empleado")));
  useEffect(()=>{if(screen==="admin"){loadReports();loadUsers();}},[screen]);

  const enterVolunteer=async()=>{
    if(!draft.name.trim()){setVolunteerError(true);return;}
    const user=await api("/api/users",{method:"POST",body:JSON.stringify(draft)});
    setCurrentUser(user);setScreen("empleado");
  };
  const enterAdmin=async()=>{
    const data=await api("/api/admin-auth",{method:"POST",body:JSON.stringify({password:adminPwd})});
    if(data.ok){setAdminError(false);setAdminPwd("");setCurrentUser({id:0,name:"Admin",emoji:"🛠️",role:"admin"});setScreen("admin");}
    else setAdminError(true);
  };
  const confirmDelete=(type,id,label)=>setDeleteConfirm({type,id,label});
  const executeDelete=async()=>{
    if(!deleteConfirm)return;
    if(deleteConfirm.type==="report")await api(`/api/reports/${deleteConfirm.id}`,{method:"DELETE"});
    if(deleteConfirm.type==="user")await api(`/api/users/${deleteConfirm.id}`,{method:"DELETE"});
    showToast("Eliminado correctamente.");setDeleteConfirm(null);
    loadReports();loadUsers();
  };
  const saveToDrive=async(report)=>{
    const data=await api("/api/save-to-drive",{method:"POST",body:JSON.stringify({report})});
    if(data.ok)showToast("📁 Guardado en Drive");else showToast("Error al guardar","error");
  };
  const pendingUsers=users.filter(u=>!reports.find(r=>r.user_id===u.id&&r.week_date===TODAY));
  const TABS=[{id:"whatsapp",label:"📱 WhatsApp"},{id:"temas",label:"🏷️ Por Temas"},{id:"tendencias",label:"📈 Tendencias"},{id:"reportes",label:"📝 Reportes"},{id:"usuarios",label:"👥 Usuarios"},{id:"pendientes",label:`⏳ Pendientes (${pendingUsers.length})`}];

  if(screen==="welcome") return (
    <div style={s.bgGradient}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} select option{color:#1e293b}`}</style>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{width:80,height:80,background:"#7c3aed",borderRadius:"1.25rem",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem",marginBottom:"1rem",boxShadow:"0 8px 32px rgba(124,58,237,0.4)"}}>⚖️</div>
          <h1 style={{color:"#fff",fontSize:"1.875rem",fontWeight:700,margin:"0 0 0.5rem"}}>La Carreta de Leyes</h1>
          <p style={{color:"#94a3b8",margin:0}}>Monitoreo Político Semanal</p>
        </div>

        <div style={{display:"flex",background:"rgba(255,255,255,0.1)",borderRadius:"1rem",padding:"0.25rem",marginBottom:"1.25rem"}}>
          {[["volunteer","🙋 Soy Analista"],["admin","🔐 Administrador"]].map(([t,label])=>(
            <button key={t} onClick={()=>{setWelcomeTab(t);setAdminError(false);setVolunteerError(false);}}
              style={{flex:1,padding:"0.625rem",borderRadius:"0.75rem",border:"none",cursor:"pointer",fontWeight:600,fontSize:"0.875rem",
                background:welcomeTab===t?"#fff":"transparent",color:welcomeTab===t?"#7c3aed":"rgba(255,255,255,0.7)",transition:"all 0.2s"}}>
              {label}
            </button>
          ))}
        </div>

        {welcomeTab==="volunteer"&&(
          <div style={s.card}>
            <p style={{color:"rgba(255,255,255,0.7)",fontSize:"0.875rem",marginTop:0}}>Personaliza tu perfil antes de ingresar.</p>
            <label style={s.labelDark}>Elige tu ícono</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1.25rem"}}>
              {EMOJIS.map(em=>(
                <button key={em} onClick={()=>setDraft(p=>({...p,emoji:em}))}
                  style={{width:40,height:40,fontSize:"1.25rem",borderRadius:"0.625rem",border:draft.emoji===em?"2px solid #fff":"2px solid transparent",
                    background:draft.emoji===em?"rgba(124,58,237,0.5)":"rgba(255,255,255,0.1)",cursor:"pointer"}}>
                  {em}
                </button>
              ))}
            </div>
            <label style={s.labelDark}>Nombre completo</label>
            <input value={draft.name} onChange={e=>{setDraft(p=>({...p,name:e.target.value}));setVolunteerError(false);}}
              placeholder="Ej. María Rodríguez" style={{...s.input(volunteerError),marginBottom:volunteerError?"0.25rem":"1rem"}}/>
            {volunteerError&&<p style={{color:"#f87171",fontSize:"0.75rem",margin:"0 0 1rem"}}>Por favor ingresa tu nombre.</p>}
            <label style={s.labelDark}>Área</label>
            <select value={draft.area} onChange={e=>setDraft(p=>({...p,area:e.target.value}))} style={{...s.selectDark,marginBottom:"1.25rem"}}>
              {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
            {draft.name.trim()&&(
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",background:"rgba(255,255,255,0.1)",borderRadius:"0.75rem",padding:"0.75rem",marginBottom:"1.25rem"}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:"#7c3aed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.25rem"}}>{draft.emoji}</div>
                <div><div style={{color:"#fff",fontWeight:600,fontSize:"0.875rem"}}>{draft.name}</div><div style={{color:"#94a3b8",fontSize:"0.75rem"}}>{draft.area} · Analista</div></div>
              </div>
            )}
            <button onClick={enterVolunteer} style={{...s.btn("#7c3aed"),width:"100%",justifyContent:"center",padding:"0.875rem"}}>Ingresar →</button>
          </div>
        )}

        {welcomeTab==="admin"&&(
          <div style={s.card}>
            <div style={{textAlign:"center",marginBottom:"1.25rem"}}>
              <div style={{width:64,height:64,background:"rgba(245,158,11,0.2)",borderRadius:"1rem",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",marginBottom:"0.75rem"}}>🔐</div>
              <p style={{color:"rgba(255,255,255,0.7)",fontSize:"0.875rem",margin:0}}>Acceso restringido para editores autorizados.</p>
            </div>
            <label style={s.labelDark}>Clave de acceso</label>
            <input type="password" value={adminPwd} onChange={e=>{setAdminPwd(e.target.value);setAdminError(false);}}
              onKeyDown={e=>e.key==="Enter"&&enterAdmin()} placeholder="••••••••"
              style={{...s.input(adminError),marginBottom:adminError?"0.25rem":"1.25rem"}}/>
            {adminError&&<p style={{color:"#f87171",fontSize:"0.75rem",margin:"0 0 1rem"}}>Clave incorrecta.</p>}
            <button onClick={enterAdmin} style={{...s.btn("#f59e0b"),width:"100%",justifyContent:"center",padding:"0.875rem"}}>Acceder →</button>
          </div>
        )}
        <p style={{textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:"0.75rem",marginTop:"1.5rem"}}>© La Carreta de Leyes · {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  if(screen==="empleado") return <EmpleadoScreen currentUser={currentUser} onLogout={()=>setScreen("welcome")}/>;

  // ADMIN
  return (
    <div style={s.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Toast toast={toast}/>
      {deleteConfirm&&(
        <div style={s.modal}>
          <div style={{background:"#fff",borderRadius:"1rem",padding:"1.5rem",width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{width:56,height:56,background:"#fef2f2",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",margin:"0 auto 1rem"}}>🗑️</div>
            <h3 style={{textAlign:"center",fontWeight:700,color:"#1e293b",margin:"0 0 0.5rem"}}>¿Confirmar eliminación?</h3>
            <p style={{textAlign:"center",color:"#64748b",fontSize:"0.875rem",margin:"0 0 1.5rem"}}>
              Vas a eliminar <strong>"{deleteConfirm.label}"</strong>.{deleteConfirm.type==="user"&&" También se eliminarán todos sus reportes."} Esta acción no se puede deshacer.
            </p>
            <div style={{display:"flex",gap:"0.75rem"}}>
              <button onClick={()=>setDeleteConfirm(null)} style={{...s.btnOutline,flex:1,padding:"0.625rem"}}>Cancelar</button>
              <button onClick={executeDelete} style={{...s.btn("#ef4444"),flex:1,justifyContent:"center",padding:"0.625rem"}}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <header style={s.header}>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <div style={{width:32,height:32,background:"#7c3aed",borderRadius:"0.5rem",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>⚖️</div>
          <span style={{fontWeight:700,color:"#1e293b"}}>La Carreta de Leyes</span>
        </div>
        <button onClick={()=>setScreen("welcome")} style={s.btnOutline}>Salir</button>
      </header>

      <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem"}}>
        <div style={{marginBottom:"1.5rem"}}>
          <h2 style={{fontSize:"1.5rem",fontWeight:700,color:"#1e293b",margin:0}}>Panel Administrativo</h2>
          <p style={{color:"#64748b",margin:"0.25rem 0 0",fontSize:"0.875rem"}}>La Carreta de Leyes · Monitoreo Político</p>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1.5rem"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setAdminTab(t.id)}
              style={s.btn(adminTab===t.id?"#7c3aed":"#fff",adminTab===t.id?"#fff":"#475569")}>
              {t.label}
            </button>
          ))}
        </div>

        {adminTab==="whatsapp"&&<AdminWhatsApp reports={reports}/>}
        {adminTab==="temas"&&<AdminTemas reports={reports} onRetagged={loadReports}/>}
        {adminTab==="tendencias"&&<AdminTendencias reports={reports}/>}

        {adminTab==="reportes"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            {reports.length===0
              ?<div style={{...s.cardWhite,textAlign:"center",padding:"3rem",color:"#94a3b8"}}><div style={{fontSize:"3rem",marginBottom:"0.5rem"}}>📭</div><p>No hay reportes aún.</p></div>
              :reports.map(r=>(
                <div key={r.id} style={s.cardWhite}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem",flexWrap:"wrap"}}>
                    <Avatar user={users.find(u=>u.id===r.user_id)||{id:r.user_id,emoji:"👤"}} size={36}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,color:"#1e293b"}}>{r.user_name}</div>
                      <div style={{fontSize:"0.75rem",color:"#94a3b8"}}>Semana {weekLabel(r.week_date)} · {r.entries.length} entrada{r.entries.length!==1?"s":""}</div>
                    </div>
                    <span style={{...s.tag("#7c3aed"),background:"#ede9fe",color:"#7c3aed"}}>{r.user_area}</span>
                    <button onClick={()=>saveToDrive(r)} style={s.btn("#d1fae5","#065f46")}>📁 Drive</button>
                    <button onClick={()=>confirmDelete("report",r.id,`Reporte de ${r.user_name}`)} style={s.btn("#fef2f2","#dc2626")}>🗑️ Eliminar</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>{r.entries.map((e,i)=><EntryCard key={e.id} entry={e} idx={i}/>)}</div>
                </div>
              ))
            }
          </div>
        )}

        {adminTab==="usuarios"&&(
          <div style={{...s.cardWhite,padding:0,overflow:"hidden"}}>
            <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid #f1f5f9"}}>
              <h3 style={{fontWeight:700,color:"#1e293b",margin:0}}>Gestión de Perfiles</h3>
              <p style={{fontSize:"0.875rem",color:"#94a3b8",margin:"0.25rem 0 0"}}>{users.length} analista{users.length!==1?"s":""}</p>
            </div>
            {users.length===0
              ?<div style={{padding:"3rem",textAlign:"center",color:"#94a3b8"}}><div style={{fontSize:"3rem",marginBottom:"0.5rem"}}>👥</div><p>No hay analistas registrados.</p></div>
              :users.map((u,i)=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.875rem 1.25rem",borderBottom:i!==users.length-1?"1px solid #f1f5f9":"none"}}>
                  <Avatar user={u} size={44}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,color:"#1e293b"}}>{u.name}</div>
                    <div style={{fontSize:"0.75rem",color:"#94a3b8"}}>{u.area} · {reports.filter(r=>r.user_id===u.id).length} reportes</div>
                  </div>
                  <button onClick={()=>confirmDelete("user",u.id,u.name)} style={s.btn("#fef2f2","#dc2626")}>🗑️ Eliminar</button>
                </div>
              ))
            }
          </div>
        )}

        {adminTab==="pendientes"&&(
          <div style={{...s.cardWhite,padding:0,overflow:"hidden"}}>
            <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid #f1f5f9"}}>
              <h3 style={{fontWeight:700,color:"#1e293b",margin:0}}>Sin reporte esta semana</h3>
            </div>
            {pendingUsers.length===0
              ?<div style={{padding:"3rem",textAlign:"center",color:"#94a3b8"}}><div style={{fontSize:"3rem",marginBottom:"0.5rem"}}>🎉</div><p>¡Todos han enviado su reporte!</p></div>
              :pendingUsers.map((u,i)=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.875rem 1.25rem",borderBottom:i!==pendingUsers.length-1?"1px solid #f1f5f9":"none"}}>
                  <Avatar user={u} size={40}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,color:"#1e293b"}}>{u.name}</div>
                    <div style={{fontSize:"0.75rem",color:"#94a3b8"}}>{u.area}</div>
                  </div>
                  <span style={{...s.tag("#fef3c7"),color:"#d97706",background:"#fef3c7"}}>⏳ Pendiente</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
