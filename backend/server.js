const express = require("express");
const cors = require("cors");
const pool = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

const DISCLAIMER = "Las opiniones expresadas son personales y no representan la posicion de La Carreta de Leyes.";
const TAGS = ["Educacion","Seguridad","Economia","Agro","Pensiones","Salud","Politica Exterior","Trabajo","Medioambiente","Tecnologia","Corrupcion"];

app.use(cors());
app.use(express.json());

app.get("/api/ping", (req, res) => res.json({ ok: true }));

async function groq(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.choices[0].message.content;
}



// USERS
app.get("/api/users", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users ORDER BY created_at ASC");
  res.json(rows);
});

app.post("/api/users", async (req, res) => {
  const { name, area, emoji, role = "empleado" } = req.body;
  if (!name) return res.status(400).json({ error: "Nombre requerido" });
  const { rows } = await pool.query("SELECT * FROM users WHERE LOWER(name)=LOWER($1) AND role='empleado'", [name]);
  if (rows.length > 0) {
    const existing = rows[0];
    await pool.query("UPDATE users SET area=$1, emoji=$2 WHERE id=$3", [area, emoji, existing.id]);
    return res.json({ ...existing, area, emoji });
  }
  const r = await pool.query(
    "INSERT INTO users (name,area,emoji,role) VALUES ($1,$2,$3,$4) RETURNING *",
    [name, area, emoji, role]
  );
  res.json(r.rows[0]);
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { rows: reports } = await pool.query("SELECT id FROM reports WHERE user_id=$1", [id]);
  for (const r of reports) {
    const { rows: entries } = await pool.query("SELECT id FROM entries WHERE report_id=$1", [r.id]);
    for (const e of entries) {
      await pool.query("DELETE FROM fuentes WHERE entry_id=$1", [e.id]);
    }
    await pool.query("DELETE FROM entries WHERE report_id=$1", [r.id]);
  }
  await pool.query("DELETE FROM reports WHERE user_id=$1", [id]);
  await pool.query("DELETE FROM users WHERE id=$1", [id]);
  res.json({ ok: true });
});

// REPORTS
app.get("/api/reports", async (req, res) => {
  const { rows: reports } = await pool.query("SELECT * FROM reports ORDER BY id DESC");
  const result = [];
  for (const r of reports) {
    const { rows: entries } = await pool.query("SELECT * FROM entries WHERE report_id=$1", [r.id]);
    const entriesWithFuentes = [];
    for (const e of entries) {
      const { rows: fuentes } = await pool.query("SELECT url FROM fuentes WHERE entry_id=$1", [e.id]);
      entriesWithFuentes.push({
        ...e,
        tags: e.tags ? JSON.parse(e.tags) : [],
        fuentes: fuentes.map(f => f.url)
      });
    }
    result.push({ ...r, entries: entriesWithFuentes });
  }
  res.json(result);
});

app.post("/api/reports", async (req, res) => {
  const { userId, userName, userArea, weekDate, submittedAt, entries } = req.body;
  const r = await pool.query(
    "INSERT INTO reports (user_id,user_name,user_area,week_date,submitted_at) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [userId, userName, userArea, weekDate, submittedAt]
  );
  const reportId = r.rows[0].id;
  for (const e of entries) {
    const er = await pool.query(
      "INSERT INTO entries (report_id,titular,resumen,actores_clave,conclusion,tags) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [reportId, e.titular, e.resumen, e.actoresClave, e.conclusion, JSON.stringify(e.tags||[])]
    );
    const entryId = er.rows[0].id;
    for (const url of (e.fuentes||[]).filter(f=>f.trim())) {
      await pool.query("INSERT INTO fuentes (entry_id,url) VALUES ($1,$2)", [entryId, url]);
    }
  }
  res.json({ id: reportId });
});

app.delete("/api/reports/:id", async (req, res) => {
  const { id } = req.params;
  const { rows: entries } = await pool.query("SELECT id FROM entries WHERE report_id=$1", [id]);
  for (const e of entries) {
    await pool.query("DELETE FROM fuentes WHERE entry_id=$1", [e.id]);
  }
  await pool.query("DELETE FROM entries WHERE report_id=$1", [id]);
  await pool.query("DELETE FROM reports WHERE id=$1", [id]);
  res.json({ ok: true });
});

// TAG ENTRIES
app.post("/api/tag-entries", async (req, res) => {
  const { entries } = req.body;
  const prompt = `Eres un clasificador de noticias politicas de Costa Rica.
Asigna 1-3 etiquetas a cada entrada usando UNICAMENTE estas etiquetas exactas (copia el texto exacto): ${TAGS.join(", ")}.

REGLAS IMPORTANTES:
- "Politica Exterior" es SOLO para noticias sobre relaciones internacionales o eventos fuera de Costa Rica. NO la uses para politica interna.
- Usa EXACTAMENTE el texto de la etiqueta como aparece en la lista, sin modificaciones.
- NO inventes etiquetas nuevas.

Responde SOLO con este JSON sin backticks ni texto adicional:
{"entries":[{"id":"...","tags":["EtiquetaExacta"]}]}

Entradas a clasificar:
${JSON.stringify(entries.map(e => ({ id: e.id, text: `${e.titular}. ${e.resumen || ""}` })))}`;

  try {
    const txt = await groq(prompt);
    console.log("[tag-entries] Respuesta:", txt.substring(0, 200));
    const jsonMatch = txt.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No devolvio JSON valido");
    const parsed = JSON.parse(jsonMatch[0]);
    for (const e of parsed.entries) {
      await pool.query("UPDATE entries SET tags=$1 WHERE id=$2", [JSON.stringify(e.tags), e.id]);
    }
    res.json(parsed);
  } catch (err) {
    console.error("[tag-entries] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GENERATE WHATSAPP
app.post("/api/generate-whatsapp", async (req, res) => {
  const { reports } = req.body;
  try {
    const lines = reports.flatMap(r => r.entries.flatMap(e => [
      `- Titular: ${e.titular}`,
      e.resumen && `  Resumen: ${e.resumen}`,
      (e.actores_clave || e.actoresClave) && `  Actores: ${e.actores_clave || e.actoresClave}`,
      e.conclusion && `  Analisis: ${e.conclusion}`
    ].filter(Boolean)));

    const fuentesPorEntrada = reports.flatMap(r =>
      r.entries.map(e => `- ${e.titular}: ${(e.fuentes||[]).filter(f=>f).join(", ")||"Sin fuentes"}`)
    ).join("\n");

    const authors = [...new Set(reports.map(r => r.user_name || r.userName))].join(", ");
    const weekDates = [...new Set(reports.map(r => r.week_date || r.weekDate))].sort();
    const fechaInicio = weekDates[0] || "";
    const fechaFin = weekDates[weekDates.length-1] || "";

    const txt = await groq(`Redacta un resumen politico para WhatsApp siguiendo EXACTAMENTE este formato:

🇨🇷 *Resumen del Acontecer Político*
📅 [rango de fechas del periodo cubierto]

Luego por cada noticia:
[emoji relevante][numero]️⃣ [Titulo corto en negrita]
[2-3 lineas de resumen claro y directo]
👉 [Una linea de analisis o conclusion]
🔗 Fuentes:
[links uno por linea]
━━━━━━━━━━━━━━

Al final:
⚖️ _Las opiniones expresadas son personales y no representan la posicion de La Carreta de Leyes._
✍️ _Analisis: ${authors}_

REGLAS:
- Usa emojis relevantes al tema de cada noticia (economía💰, seguridad🚨, ambiente🌿, internacional🌎, etc)
- NO uses "Politica Exterior" ni menciones etiquetas
- El rango de fechas es aproximadamente ${fechaInicio} a ${fechaFin}
- Pon las fuentes EXACTAMENTE como te las doy, sin modificarlas
- Solo el texto final, sin explicaciones

NOTICIAS:
${lines.join("\n")}

FUENTES POR NOTICIA (usa estas URLs exactas):
${fuentesPorEntrada}`);
    res.json({ message: txt.trim() });
  } catch(err) {
    console.error("[generate-whatsapp] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// SAVE TO DRIVE
app.post("/api/save-to-drive", async (req, res) => {
  const { report } = req.body;

  if (!process.env.ZAPIER_WEBHOOK_URL) {
    return res.status(500).json({ error: "ZAPIER_WEBHOOK_URL no configurada" });
  }

  const nombre = report.user_name || report.userName || "Analista";
  const area   = report.user_area || report.userArea || "";
  const semana = report.week_date || report.weekDate || "";

  const contenido = report.entries.map((e, i) => [
    `ENTRADA #${i + 1}`,
    `Titular:    ${e.titular || "-"}`,
    `Resumen:    ${e.resumen || "-"}`,
    `Actores:    ${e.actores_clave || e.actoresClave || "-"}`,
    `Conclusion: ${e.conclusion || "-"}`,
    `Fuentes:    ${(e.fuentes || []).filter(f=>f).join(", ") || "-"}`,
    `Temas:      ${(e.tags || []).join(", ") || "Sin clasificar"}`,
  ].join("\n")).join("\n\n" + "-".repeat(50) + "\n\n");

  const payload = {
    fileName: `Reporte_${nombre.replace(/ /g, "_")}_${semana}`,
    author: nombre,
    area,
    week: semana,
    entriesCount: report.entries.length,
    content: [
      "LA CARRETA DE LEYES - MONITOREO POLITICO",
      "=".repeat(50),
      `Autor:    ${nombre}`,
      `Area:     ${area}`,
      `Semana:   ${semana}`,
      `Entradas: ${report.entries.length}`,
      "=".repeat(50),
      "",
      contenido,
      "",
      "-".repeat(50),
      DISCLAIMER
    ].join("\n")
  };

  try {
    const response = await fetch(process.env.ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Zapier respondio ${response.status}: ${body.substring(0, 100)}`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[save-to-drive] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ADMIN AUTH
app.post("/api/admin-auth", (req, res) => {
  req.body.password === process.env.ADMIN_PASSWORD
    ? res.json({ ok: true })
    : res.status(401).json({ error: "Clave incorrecta" });
});

app.listen(PORT, () => {
  console.log(`Puerto ${PORT}`);
  console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? "cargada" : "FALTA");
  console.log("ZAPIER_WEBHOOK_URL:", process.env.ZAPIER_WEBHOOK_URL ? "cargada" : "FALTA");
  console.log("ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD ? "cargada" : "FALTA");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "cargada" : "FALTA");

  setInterval(() => {
    fetch("https://carreta-backend.onrender.com/api/ping")
      .then(() => console.log("Ping OK"))
      .catch(() => {});
  }, 10 * 60 * 1000);
});
