import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = import.meta.env.VITE_API_URL || "";
const AREAS = ["Análisis Político","Economía","Seguridad","Legislación","Internacional","General"];
const TAGS = ["Educación","Seguridad","Economía","Agro","Pensiones","Salud","Política Exterior","Trabajo","Medioambiente","Tecnología","Corrupción"];
const TAG_COLORS = {"Educación":"#6366f1","Seguridad":"#ef4444","Economía":"#f59e0b","Agro":"#22c55e","Pensiones":"#8b5cf6","Salud":"#06b6d4","Política Exterior":"#3b82f6","Trabajo":"#f97316","Medioambiente":"#10b981","Tecnología":"#0ea5e9","Corrupción":"#dc2626"};
const AV_COLORS = ["bg-violet-500","bg-blue-500","bg-teal-500","bg-rose-500","bg-amber-500","bg-indigo-500"];
const EMOJIS = ["👤","👩‍💻","👨‍💻","🧑‍💼","👩‍🔬","🧑‍🎨","🦸","🧑‍🏫","📣","💼","🎨","🚀","⭐","🦊","🧑‍🔧"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DISCLAIMER = "Las opiniones expresadas son personales y no representan la posición de La Carreta de Leyes.";

const getWeekDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split("T")[0];
};
const weekLabel = d => {
  const date = new Date(d + "T12:00:00");
  const start = new Date(date); start.setDate(date.getDate() - date.getDay() + 1);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return `${start.getDate()}/${start.getMonth()+1} – ${end.getDate()}/${end.getMonth()+1}/${end.getFullYear()}`;
};
const cidx = u => u ? (u.id - 1) % AV_COLORS.length : 0;
const emptyEntry = () => ({ id: Date.now()+"_"+Math.random().toString(36).slice(2), titular:"", resumen:"", actoresClave:"", conclusion:"", fuentes:[""], tags:[] });
const api = (path, opts) => fetch(API + path, { headers:{"Content-Type":"application/json"}, ...opts }).then(r => r.json());

const TagBadge = ({tag}) => (
  <span className="inline-flex text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{backgroundColor:TAG_COLORS[tag]||"#6b7280"}}>{tag}</span>
);

const EntryCard = ({entry, idx}) => (
  <div className="border border-slate-200 rounded-xl p-4 bg-white">
    <div className="font-bold text-slate-800 text-sm mb-2"><span className="text-slate-400 mr-1">#{idx+1}</span>{entry.titular}</div>
    {entry.tags?.length>0 && <div className="flex flex-wrap gap-1 mb-3">{entry.tags.map(t=><TagBadge key={t} tag={t}/>)}</div>}
    <div className="space-y-1.5 text-sm">
      {entry.resumen && <div><span className="font-semibold text-slate-500">Resumen: </span><span className="text-slate-600">{entry.resumen}</span></div>}
      {entry.actoresClave && <div><span className="font-semibold text-slate-500">Actores: </span><span className="text-slate-600">{entry.actoresClave}</span></div>}
      {entry.conclusion && <div><span className="font-semibold text-slate-500">Conclusión: </span><span className="text-slate-600">{entry.conclusion}</span></div>}
      {entry.fuentes?.filter(f=>f).length>0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {entry.fuentes.filter(f=>f).map((f,i)=>(
            <a key={i} href={f} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline text-xs">
              🔗 {f.replace(/https?:\/\//,"").slice(0,40)}{f.length>40?"...":""}
            </a>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ── ADMIN TABS ─────────────────────────────────────────────────────

function AdminWhatsApp({reports}) {
  const [selWeek, setSelWeek] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const weeks = [...new Set(reports.map(r=>r.week_date))].sort().reverse();
  const weekReports = selWeek ? reports.filter(r=>r.week_date===selWeek) : [];

  const generate = async () => {
    setLoading(true); setWaMsg(""); setError(null);
    try {
      const data = await api("/api/generate-whatsapp", { method:"POST", body: JSON.stringify({ reports: weekReports }) });
      if (data.message) setWaMsg(data.message);
      else setError(data.error || "Error al generar.");
    } catch { setError("Error de conexión. Intenta de nuevo."); }
    setLoading(false);
  };

  const copy = () => { navigator.clipboard.writeText(waMsg); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-1">📱 Generar Mensaje para WhatsApp</h3>
      <p className="text-sm text-slate-400 mb-4">Resumen ejecutivo listo para compartir con fuentes y disclaimer</p>
      <div className="flex gap-3 flex-wrap mb-4">
        <select value={selWeek} onChange={e=>{setSelWeek(e.target.value);setWaMsg("");}}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 min-w-0">
          <option value="">-- Selecciona semana --</option>
          {weeks.map(w=><option key={w} value={w}>Semana {weekLabel(w)} · {reports.filter(r=>r.week_date===w).length} reportes</option>)}
        </select>
        <button onClick={generate} disabled={!selWeek||loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition flex-shrink-0
            ${!selWeek||loading?"bg-slate-100 text-slate-400":"bg-violet-600 hover:bg-violet-700 text-white"}`}>
          {loading?<><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block"/>Generando...</>: waMsg?"🔄 Regenerar":"🤖 Generar"}
        </button>
      </div>
      {!waMsg&&!loading&&selWeek&&<div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">Haz clic en "Generar" para crear el mensaje.</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>}
      {waMsg && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-600">Vista previa</span>
            <button onClick={copy} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${copied?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {copied?"✓ Copiado!":"📋 Copiar"}
            </button>
          </div>
          <div className="bg-[#ECE5DD] rounded-2xl p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[28rem] overflow-y-auto">{waMsg}</div>
        </div>
      )}
    </div>
  );
}

function AdminTemas({reports, onRetagged}) {
  const [loading, setLoading] = useState(false);
  const [selTag, setSelTag] = useState(null);
  const allEntries = reports.flatMap(r => r.entries.map(e=>({...e, reporterName:r.user_name})));
  const untagged = allEntries.filter(e=>!e.tags||e.tags.length===0).length;

  const tagAll = async () => {
    setLoading(true);
    try {
      await api("/api/tag-entries", { method:"POST", body: JSON.stringify({ entries: allEntries }) });
      onRetagged();
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const byTag = {};
  TAGS.forEach(t=>{byTag[t]=[];});
  allEntries.forEach(e=>(e.tags||[]).forEach(t=>{if(byTag[t])byTag[t].push(e);}));
  const usedTags = TAGS.filter(t=>byTag[t].length>0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-slate-800">🏷️ Entradas por Tema</h3>
          <p className="text-sm text-slate-400 mt-0.5">{untagged>0?`${untagged} sin etiquetar`:"✅ Todas etiquetadas"}</p>
        </div>
        <button onClick={tagAll} disabled={loading||untagged===0}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition
            ${loading||untagged===0?"bg-slate-100 text-slate-400":"bg-violet-600 hover:bg-violet-700 text-white"}`}>
          {loading?<><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block"/>Etiquetando...</>:"🤖 Etiquetar con IA"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setSelTag(null)} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${!selTag?"bg-slate-800 text-white":"bg-slate-100 text-slate-600"}`}>Todos</button>
        {usedTags.map(t=>(
          <button key={t} onClick={()=>setSelTag(selTag===t?null:t)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold text-white transition"
            style={{backgroundColor:selTag===t?TAG_COLORS[t]:"#94a3b8"}}>
            {t} ({byTag[t].length})
          </button>
        ))}
      </div>
      {usedTags.length===0
        ? <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm"><div className="text-3xl mb-2">🏷️</div>Haz clic en "Etiquetar con IA".</div>
        : <div className="space-y-4">
            {(selTag?[selTag]:usedTags).map(tag=>(
              <div key={tag}>
                <div className="flex items-center gap-2 mb-2"><TagBadge tag={tag}/><span className="text-xs text-slate-400">{byTag[tag].length} entrada{byTag[tag].length!==1?"s":""}</span></div>
                <div className="space-y-2">
                  {byTag[tag].map(e=>(
                    <div key={e.id} className="bg-slate-50 rounded-xl p-3">
                      <div className="font-semibold text-slate-700 text-sm">{e.titular}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Por {e.reporterName}</div>
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
  const [month, setMonth] = useState(new Date().getMonth()+1);
  const year = new Date().getFullYear();
  const monthReports = reports.filter(r=>{ const d=new Date(r.week_date+"T12:00:00"); return d.getMonth()+1===month&&d.getFullYear()===year; });
  const freq = {}; TAGS.forEach(t=>{freq[t]=0;});
  monthReports.forEach(r=>r.entries.forEach(e=>(e.tags||[]).forEach(t=>{if(freq[t]!==undefined)freq[t]++;})));
  const chartData = TAGS.map(t=>({tag:t,count:freq[t]})).filter(d=>d.count>0).sort((a,b)=>b.count-a.count);
  const total = chartData.reduce((s,d)=>s+d.count,0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h3 className="font-bold text-slate-800">📈 Agenda Política Mensual</h3><p className="text-sm text-slate-400 mt-0.5">Frecuencia de temas</p></div>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
          {MONTHS.map((m,i)=><option key={i} value={i+1}>{m} {year}</option>)}
        </select>
      </div>
      {chartData.length===0
        ? <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm"><div className="text-3xl mb-2">📊</div>No hay datos etiquetados en {MONTHS[month-1]}.</div>
        : <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{top:5,right:10,left:-20,bottom:65}}>
                <XAxis dataKey="tag" tick={{fontSize:10}} angle={-40} textAnchor="end" interval={0}/>
                <YAxis tick={{fontSize:11}} allowDecimals={false}/>
                <Tooltip formatter={(v,_,p)=>[`${v} entradas (${Math.round(v/total*100)}%)`,p.payload.tag]}/>
                <Bar dataKey="count" radius={[6,6,0,0]}>{chartData.map((d,i)=><Cell key={i} fill={TAG_COLORS[d.tag]||"#6b7280"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {chartData.map(d=>(
                <div key={d.tag} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:TAG_COLORS[d.tag]||"#6b7280"}}/>
                  <span className="text-xs text-slate-600 flex-1 truncate">{d.tag}</span>
                  <span className="text-xs font-bold text-slate-800">{d.count}</span>
                  <span className="text-xs text-slate-400">{Math.round(d.count/total*100)}%</span>
                </div>
              ))}
            </div>
          </>
      }
    </div>
  );
}

// ── EMPLOYEE FORM ──────────────────────────────────────────────────
function EmpleadoScreen({currentUser, onLogout}) {
  const [reports, setReports] = useState([]);
  const [view, setView] = useState("form");
  const [entries, setEntries] = useState([emptyEntry()]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const TODAY = getWeekDate();

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    api(`/api/reports`).then(data => setReports(data.filter(r=>r.user_id===currentUser.id)));
  }, []);

  const addEntry = () => setEntries(p=>[...p,emptyEntry()]);
  const removeEntry = id => { if(entries.length===1)return; setEntries(p=>p.filter(e=>e.id!==id)); };
  const upEntry = (id,field,val) => setEntries(p=>p.map(e=>e.id===id?{...e,[field]:val}:e));
  const addFuente = id => setEntries(p=>p.map(e=>e.id===id?{...e,fuentes:[...e.fuentes,""]}:e));
  const upFuente = (id,fi,val) => setEntries(p=>p.map(e=>e.id===id?{...e,fuentes:e.fuentes.map((f,i)=>i===fi?val:f)}:e));
  const delFuente = (id,fi) => setEntries(p=>p.map(e=>e.id===id?{...e,fuentes:e.fuentes.filter((_,i)=>i!==fi)}:e));

  const submit = async () => {
    if(entries.some(e=>!e.titular.trim())){ showToast("Cada entrada necesita un titular.","error"); return; }
    setSubmitting(true);
    const sentAt = new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"});
    try {
      await api("/api/reports", { method:"POST", body: JSON.stringify({ userId:currentUser.id, userName:currentUser.name, userArea:currentUser.area, weekDate:TODAY, submittedAt:sentAt, entries }) });
      const updated = await api(`/api/reports`);
      setReports(updated.filter(r=>r.user_id===currentUser.id));
      setView("history"); showToast("¡Reporte enviado!");
    } catch { showToast("Error al enviar.","error"); }
    setSubmitting(false);
  };

  const myReports = reports.sort((a,b)=>b.id-a.id);

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type==="error"?"bg-red-500":"bg-emerald-500"}`}>{toast.msg}</div>}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white text-sm">⚖️</div>
          <span className="font-bold text-slate-800 hidden sm:block">La Carreta de Leyes</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${AV_COLORS[cidx(currentUser)]} flex items-center justify-center text-base`}>{currentUser.emoji}</div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{currentUser.name}</span>
          <button onClick={onLogout} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">Salir</button>
        </div>
      </header>
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Monitoreo Político Semanal</h2>
            <p className="text-slate-500 mt-1">Semana del {weekLabel(TODAY)}</p>
          </div>
          <div className="flex gap-2">
            {["form","history"].map(v=>(
              <button key={v} onClick={()=>setView(v)} className={`px-4 py-2 text-sm rounded-xl font-medium transition ${view===v?"bg-violet-600 text-white":"bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {v==="form"?"✏️ Nuevo":"📋 Mis reportes"}
              </button>
            ))}
          </div>
        </div>

        {view==="form" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${AV_COLORS[cidx(currentUser)]} flex items-center justify-center text-lg`}>{currentUser.emoji}</div>
              <div><div className="font-semibold text-slate-800">{currentUser.name}</div><div className="text-sm text-slate-400">{currentUser.area} · Semana del {weekLabel(TODAY)}</div></div>
            </div>
            {entries.map((entry,idx)=>(
              <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-slate-700 text-sm">📌 Noticia #{idx+1}</span>
                  {entries.length>1 && <button onClick={()=>removeEntry(entry.id)} className="text-xs text-red-400 hover:text-red-600">✕ Eliminar</button>}
                </div>
                <div className="space-y-4">
                  {[
                    {key:"titular",label:"Titular — Idea Principal",ph:"La noticia o hecho político más relevante...",rows:1,req:true},
                    {key:"resumen",label:"Resumen — Ideas secundarias",ph:"Contexto y detalles que complementan el titular...",rows:3},
                    {key:"actoresClave",label:"Actores Clave",ph:"Ministerios, partidos, instituciones, personas...",rows:1},
                    {key:"conclusion",label:"Conclusión — Análisis",ph:"¿Qué implica esto? ¿Cuál es el impacto esperado?",rows:3},
                  ].map(({key,label,ph,rows,req})=>(
                    <div key={key}>
                      <label className="text-sm font-semibold text-slate-600 mb-1 block">{label}{req&&<span className="text-red-500 ml-1">*</span>}</label>
                      {rows===1
                        ? <input value={entry[key]} onChange={e=>upEntry(entry.id,key,e.target.value)} placeholder={ph} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"/>
                        : <textarea rows={rows} value={entry[key]} onChange={e=>upEntry(entry.id,key,e.target.value)} placeholder={ph} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"/>
                      }
                    </div>
                  ))}
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1 block">Fuentes</label>
                    {entry.fuentes.map((f,fi)=>(
                      <div key={fi} className="flex gap-2 mb-2">
                        <input value={f} onChange={e=>upFuente(entry.id,fi,e.target.value)} placeholder="https://..." className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"/>
                        {entry.fuentes.length>1&&<button onClick={()=>delFuente(entry.id,fi)} className="text-slate-400 hover:text-red-400 px-2">✕</button>}
                      </div>
                    ))}
                    <button onClick={()=>addFuente(entry.id)} className="text-xs text-violet-600 hover:text-violet-700 font-medium">+ Agregar fuente</button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addEntry} className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-4 text-slate-400 hover:border-violet-400 hover:text-violet-500 transition text-sm font-medium">+ Agregar otra noticia</button>
            <button onClick={submit} disabled={submitting} className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold py-3 rounded-xl transition">
              {submitting?"Enviando...":"Enviar Reporte"}
            </button>
          </div>
        )}

        {view==="history" && (
          <div className="space-y-5">
            {myReports.length===0
              ? <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400"><div className="text-4xl mb-2">📭</div><p>Aún no has enviado reportes.</p></div>
              : myReports.map(r=>(
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">✅</div>
                    <div><div className="font-semibold text-slate-800">Semana del {weekLabel(r.week_date)}</div><div className="text-xs text-slate-400">{r.entries.length} entrada{r.entries.length!==1?"s":""} · {r.submitted_at}</div></div>
                  </div>
                  <div className="space-y-3">{r.entries.map((e,i)=><EntryCard key={e.id} entry={e} idx={i}/>)}</div>
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
  const [screen, setScreen] = useState("welcome");
  const [currentUser, setCurrentUser] = useState(null);
  const [welcomeTab, setWelcomeTab] = useState("volunteer");
  const [draft, setDraft] = useState({name:"",area:AREAS[0],emoji:"👤"});
  const [adminPwd, setAdminPwd] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [volunteerError, setVolunteerError] = useState(false);
  const [adminTab, setAdminTab] = useState("whatsapp");
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };
  const TODAY = getWeekDate();

  const loadReports = () => api("/api/reports").then(setReports);
  const loadUsers = () => api("/api/users").then(data => setUsers(data.filter(u=>u.role==="empleado")));

  useEffect(() => { if(screen==="admin"){ loadReports(); loadUsers(); } }, [screen]);

  const enterVolunteer = async () => {
    if(!draft.name.trim()){ setVolunteerError(true); return; }
    const user = await api("/api/users", { method:"POST", body: JSON.stringify(draft) });
    setCurrentUser(user); setScreen("empleado");
  };

  const enterAdmin = async () => {
    const data = await api("/api/admin-auth", { method:"POST", body: JSON.stringify({password:adminPwd}) });
    if(data.ok){ setAdminError(false); setCurrentUser({id:0,name:"Admin",emoji:"🛠️",role:"admin"}); setScreen("admin"); }
    else { setAdminError(true); }
  };

  const confirmDelete = (type,id,label) => setDeleteConfirm({type,id,label});
  const executeDelete = async () => {
    if(!deleteConfirm) return;
    if(deleteConfirm.type==="report") await api(`/api/reports/${deleteConfirm.id}`,{method:"DELETE"});
    if(deleteConfirm.type==="user") await api(`/api/users/${deleteConfirm.id}`,{method:"DELETE"});
    showToast("Eliminado correctamente.");
    setDeleteConfirm(null);
    loadReports(); loadUsers();
  };

  const saveToDrive = async (report) => {
    const data = await api("/api/save-to-drive",{method:"POST",body:JSON.stringify({report})});
    if(data.ok) showToast("📁 Guardado en Drive");
    else showToast("Error al guardar","error");
  };

  const pendingUsers = users.filter(u=>!reports.find(r=>r.user_id===u.id&&r.week_date===TODAY));
  const TABS = [{id:"whatsapp",label:"📱 WhatsApp"},{id:"temas",label:"🏷️ Por Temas"},{id:"tendencias",label:"📈 Tendencias"},{id:"reportes",label:"📝 Reportes"},{id:"usuarios",label:"👥 Usuarios"},{id:"pendientes",label:`⏳ Pendientes (${pendingUsers.length})`}];

  // WELCOME
  if(screen==="welcome") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-violet-600 rounded-3xl mb-4 shadow-2xl"><span className="text-4xl">⚖️</span></div>
          <h1 className="text-3xl font-bold text-white">La Carreta de Leyes</h1>
          <p className="text-slate-400 mt-2">Monitoreo Político Semanal</p>
        </div>
        <div className="flex bg-white/10 rounded-2xl p-1 mb-5">
          {["volunteer","admin"].map(t=>(
            <button key={t} onClick={()=>{setWelcomeTab(t);setAdminError(false);setVolunteerError(false);}}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${welcomeTab===t?"bg-white text-violet-700 shadow":"text-slate-300 hover:text-white"}`}>
              {t==="volunteer"?"🙋 Soy Analista":"🔐 Administrador"}
            </button>
          ))}
        </div>

        {welcomeTab==="volunteer" && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
            <p className="text-slate-300 text-sm">Personaliza tu perfil antes de ingresar.</p>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 block">Elige tu ícono</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(em=>(
                  <button key={em} onClick={()=>setDraft(p=>({...p,emoji:em}))}
                    className={`w-10 h-10 text-xl rounded-xl transition ${draft.emoji===em?"bg-violet-500 ring-2 ring-white":"bg-white/10 hover:bg-white/20"}`}>{em}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Nombre completo</label>
              <input value={draft.name} onChange={e=>{setDraft(p=>({...p,name:e.target.value}));setVolunteerError(false);}} placeholder="Ej. María Rodríguez"
                className={`w-full rounded-xl px-4 py-3 text-sm bg-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${volunteerError?"ring-2 ring-red-400":"focus:ring-violet-400"}`}/>
              {volunteerError&&<p className="text-red-400 text-xs mt-1">Por favor ingresa tu nombre.</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Área</label>
              <select value={draft.area} onChange={e=>setDraft(p=>({...p,area:e.target.value}))}
                className="w-full rounded-xl px-4 py-3 text-sm bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                {AREAS.map(a=><option key={a} value={a} className="text-slate-800">{a}</option>)}
              </select>
            </div>
            {draft.name.trim()&&(
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-xl">{draft.emoji}</div>
                <div><div className="text-white font-semibold text-sm">{draft.name}</div><div className="text-slate-400 text-xs">{draft.area} · Analista</div></div>
              </div>
            )}
            <button onClick={enterVolunteer} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition text-sm">Ingresar →</button>
          </div>
        )}

        {welcomeTab==="admin" && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🔐</div>
              <p className="text-slate-300 text-sm">Acceso restringido para editores autorizados.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Clave de acceso</label>
              <input type="password" value={adminPwd} onChange={e=>{setAdminPwd(e.target.value);setAdminError(false);}} onKeyDown={e=>e.key==="Enter"&&enterAdmin()} placeholder="••••••••"
                className={`w-full rounded-xl px-4 py-3 text-sm bg-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${adminError?"ring-2 ring-red-400":"focus:ring-amber-400"}`}/>
              {adminError&&<p className="text-red-400 text-xs mt-1">Clave incorrecta.</p>}
            </div>
            <button onClick={enterAdmin} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition text-sm">Acceder →</button>
          </div>
        )}
        <p className="text-center text-slate-500 text-xs mt-6">© La Carreta de Leyes · {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  // EMPLEADO
  if(screen==="empleado") return <EmpleadoScreen currentUser={currentUser} onLogout={()=>setScreen("welcome")}/>;

  // ADMIN
  return (
    <div className="min-h-screen bg-slate-50">
      {toast&&<div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type==="error"?"bg-red-500":"bg-emerald-500"}`}>{toast.msg}</div>}
      {deleteConfirm&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🗑️</div>
            <h3 className="font-bold text-slate-800 text-center text-lg mb-2">¿Confirmar eliminación?</h3>
            <p className="text-slate-500 text-sm text-center mb-6">Vas a eliminar <span className="font-semibold text-slate-700">"{deleteConfirm.label}"</span>.{deleteConfirm.type==="user"&&" También se eliminarán todos sus reportes."} Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={executeDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white text-sm">⚖️</div>
          <span className="font-bold text-slate-800 hidden sm:block">La Carreta de Leyes</span>
        </div>
        <button onClick={()=>setScreen("welcome")} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">Salir</button>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6"><h2 className="text-2xl font-bold text-slate-800">Panel Administrativo</h2><p className="text-slate-500 mt-1">La Carreta de Leyes · Monitoreo Político</p></div>
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setAdminTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${adminTab===t.id?"bg-violet-600 text-white":"bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>{t.label}</button>
          ))}
        </div>

        {adminTab==="whatsapp" && <AdminWhatsApp reports={reports}/>}
        {adminTab==="temas" && <AdminTemas reports={reports} onRetagged={loadReports}/>}
        {adminTab==="tendencias" && <AdminTendencias reports={reports}/>}

        {adminTab==="reportes" && (
          <div className="space-y-5">
            {reports.length===0
              ? <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400"><div className="text-4xl mb-2">📭</div><p>No hay reportes aún.</p></div>
              : reports.map(r=>(
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className={`w-9 h-9 rounded-full ${AV_COLORS[(r.user_id-1)%AV_COLORS.length]} flex items-center justify-center text-base`}>{users.find(u=>u.id===r.user_id)?.emoji||"👤"}</div>
                    <div className="flex-1"><div className="font-semibold text-slate-800">{r.user_name}</div><div className="text-xs text-slate-400">Semana {weekLabel(r.week_date)} · {r.entries.length} entrada{r.entries.length!==1?"s":""}</div></div>
                    <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700">{r.user_area}</span>
                    <button onClick={()=>saveToDrive(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition">📁 Drive</button>
                    <button onClick={()=>confirmDelete("report",r.id,`Reporte de ${r.user_name}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-semibold transition">🗑️ Eliminar</button>
                  </div>
                  <div className="space-y-3">{r.entries.map((e,i)=><EntryCard key={e.id} entry={e} idx={i}/>)}</div>
                </div>
              ))
            }
          </div>
        )}

        {adminTab==="usuarios" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b"><h3 className="font-bold text-slate-700">Gestión de Perfiles</h3><p className="text-sm text-slate-400 mt-0.5">{users.length} analista{users.length!==1?"s":""}</p></div>
            {users.length===0
              ? <div className="p-8 text-center text-slate-400"><div className="text-4xl mb-2">👥</div><p>No hay analistas registrados.</p></div>
              : users.map((u,i)=>(
                <div key={u.id} className={`flex items-center gap-4 px-5 py-4 ${i!==users.length-1?"border-b border-slate-100":""}`}>
                  <div className={`w-11 h-11 rounded-full ${AV_COLORS[cidx(u)]} flex items-center justify-center text-xl`}>{u.emoji}</div>
                  <div className="flex-1"><div className="font-semibold text-slate-800">{u.name}</div><div className="text-xs text-slate-400">{u.area} · {reports.filter(r=>r.user_id===u.id).length} reportes</div></div>
                  <button onClick={()=>confirmDelete("user",u.id,u.name)} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-semibold transition">🗑️ Eliminar</button>
                </div>
              ))
            }
          </div>
        )}

        {adminTab==="pendientes" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b"><h3 className="font-bold text-slate-700">Sin reporte esta semana</h3></div>
            {pendingUsers.length===0
              ? <div className="p-8 text-center text-slate-400"><div className="text-4xl mb-2">🎉</div><p>¡Todos han enviado su reporte!</p></div>
              : pendingUsers.map((u,i)=>(
                <div key={u.id} className={`flex items-center gap-4 px-5 py-4 ${i!==pendingUsers.length-1?"border-b border-slate-100":""}`}>
                  <div className={`w-10 h-10 rounded-full ${AV_COLORS[cidx(u)]} flex items-center justify-center text-base`}>{u.emoji}</div>
                  <div className="flex-1"><div className="font-semibold text-slate-800">{u.name}</div><div className="text-xs text-slate-400">{u.area}</div></div>
                  <span className="text-xs px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-medium">⏳ Pendiente</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
