const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const DISCLAIMER = "Las opiniones expresadas son personales y no representan la posición de La Carreta de Leyes.";
const TAGS = ["Educación","Seguridad","Economía","Agro","Pensiones","Salud","Política Exterior","Trabajo","Medioambiente","Tecnología","Corrupción"];

app.use(cors());
app.use(express.json());

// Endpoint para mantener el servidor despierto
app.get("/api/ping", (req, res) => res.json({ ok: true }));

async function gemini(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function shortenUrl(url) {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const short = await res.text();
    return short.startsWith("https://tinyurl.com") ? short : url;
  } catch { return url; }
}

// USERS
app.get("/api/users", (req, res) => {
  res.json(db.prepare("SELECT * FROM users ORDER BY created_at ASC").all());
});

app.post("/api/users", (req, res) => {
  const { name, area, emoji, role = "empleado" } = req.body;
  if (!name) return res.status(400).json({ error: "Nombre requerido" });
  const existing = db.prepare("SELECT * FROM users WHERE LOWER(name)=LOWER(?) AND role='empleado'").get(name);
  if (existing) {
    db.prepare("UPDATE users SET area=?, emoji=? WHERE id=?").run(area, emoji, existing.id);
    return res.json({ ...existing, area, emoji });
  }
  const r = db.prepare("INSERT INTO users (name,area,emoji,role) VALUES (?,?,?,?)").run(name, area, emoji, role);
  res.json({ id: r.lastInsertRowid, name, area, emoji, role });
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const reports = db.prepare("SELECT id FROM reports WHERE user_id=?").all(id);
  reports.forEach(r => {
    db.prepare("SELECT id FROM entries WHERE report_id=?").all(r.id)
      .forEach(e => db.prepare("DELETE FROM fuentes WHERE entry_id=?").run(e.id));
    db.prepare("DELETE FROM entries WHERE report_id=?").run(r.id);
  });
  db.prepare("DELETE FROM reports WHERE user_id=?").run(id);
  db.prepare("DELETE FROM users WHERE id=?").run(id);
  res.json({ ok: true });
});

// REPORTS
app.get("/api/reports", (req, res) => {
  const reports = db.prepare("SELECT * FROM reports ORDER BY id DESC").all();
  res.json(reports.map(r => ({
    ...r,
    entries: db.prepare("SELECT * FROM entries WHERE report_id=?").all(r.id).map(e => ({
      ...e,
      tags: e.tags ? JSON.parse(e.tags) : [],
      fuentes: db.prepare("SELECT url FROM fuentes WHERE entry_id=?").all(e.id).map(f => f.url)
    }))
  })));
});

app.post("/api/reports", (req, res) => {
  const { userId, userName, userArea, weekDate, submittedAt, entries } = req.body;
  const r = db.prepare("INSERT INTO reports (user_id,user_name,user_area,week_date,submitted_at) VALUES (?,?,?,?,?)")
    .run(userId, userName, userArea, weekDate, submittedAt);
  entries.forEach(e => {
    const er = db.prepare("INSERT INTO entries (report_id,titular,resumen,actores_clave,conclusion,tags) VALUES (?,?,?,?,?,?)")
      .run(r.lastInsertRowid, e.titular, e.resumen, e.actoresClave, e.conclusion, JSON.stringify(e.tags||[]));
    (e.fuentes||[]).filter(f=>f.trim()).forEach(url =>
      db.prepare("INSERT INTO fuentes (entry_id,url) VALUES (?,?)").run(er.lastInsertRowid, url)
    );
  });
  res.json({ id: r.lastInsertRowid });
});

app.delete("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("SELECT id FROM entries WHERE report_id=?").all(id)
    .forEach(e => db.prepare("DELETE FROM fuentes WHERE entry_id=?").run(e.id));
  db.prepare("DELETE FROM entries WHERE report_id=?").run(id);
  db.prepare("DELETE FROM reports WHERE id=?").run(id);
  res.json({ ok: true });
});

// TAG ENTRIES
app.post("/api/tag-entries", async (req, res) => {
  const { entries } = req.body;
  const prompt = `Analiza cada entrada y asígnale 1-3 etiquetas del listado: ${TAGS.join(", ")}.
Responde SOLO JSON sin backticks ni explicaciones adicionales:
{"entries":[{"id":"...","tags":["Tag1"]}]}
Entradas: ${JSON.stringify(entries.map(e => ({ id: e.id, text: `${e.titular}. ${e.resumen || ""}` })))}`;

  try {
    const txt = await gemini(prompt);
    console.log("[tag-entries] Respuesta Gemini:", txt.substring(0, 200));

    // Extrae el JSON aunque Gemini agregue texto alrededor
    const jsonMatch = txt.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Gemini no devolvió JSON válido: " + txt.substring(0, 100));

    const parsed = JSON.parse(jsonMatch[0]);
    parsed.entries.forEach(e =>
      db.prepare("UPDATE entries SET tags=? WHERE id=?").run(JSON.stringify(e.tags), e.id)
    );
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
    for (const r of reports)
      for (const e of r.entries)
        e.fuentesCortas = await Promise.all((e.fuentes||[]).filter(f=>f.trim()).map(shortenUrl));

    const lines = reports.flatMap(r => r.entries.flatMap(e => [
      `- Titular: ${e.titular}`,
      e.resumen && `  Resumen: ${e.resumen}`,
      e.actoresClave && `  Actores: ${e.actoresClave}`,
      e.conclusion && `  Análisis: ${e.conclusion}`
    ].filter(Boolean)));

    const fuentesPorEntrada = reports.flatMap(r =>
      r.entries.map(e => `- ${e.titular}: ${e.fuentesCortas?.join(", ")||"Sin fuentes"}`)
    ).join("\n");

    const authors = [...new Set(reports.map(r=>r.userName))].join(", ");
    const txt = await gemini(`Redacta un boletín político para WhatsApp en español.
REGLAS:
- Emojis moderados, formato WhatsApp (*negrita*, _cursiva_)
- Secciones claras, no pierdas contexto político
- Fuentes inmediatamente debajo de cada nota: 🔗 https://tinyurl.com/...
- NO sección de fuentes al final
- NO menciones etiquetas
- Penúltima línea: "⚖️ _${DISCLAIMER}_"
- Última línea: "✍️ _Análisis: ${authors}_"
- Solo el texto, sin explicaciones

MONITOREO:
${lines.join("\n")}

FUENTES POR ENTRADA:
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

  // Validación temprana de la variable de entorno
  if (!process.env.ZAPIER_WEBHOOK_URL) {
    console.error("[save-to-drive] ZAPIER_WEBHOOK_URL no está definida en las variables de entorno");
    return res.status(500).json({ error: "ZAPIER_WEBHOOK_URL no configurada en el servidor" });
  }

  const content = report.entries.map((e, i) =>
    `#${i + 1} ${e.titular}\nResumen: ${e.resumen || "—"}\nActores: ${e.actoresClave || "—"}\nConclusión: ${e.conclusion || "—"}\nFuentes: ${(e.fuentes || []).join(", ") || "—"}\nTemas: ${(e.tags || []).join(", ") || "Sin clasificar"}`
  ).join("\n\n---\n\n");

  const payload = {
    fileName: `Reporte_${report.userName.replace(/ /g, "_")}_${report.weekDate}.txt`,
    author: report.userName,
    area: report.userArea,
    week: report.weekDate,
    entriesCount: report.entries.length,
    content: `LA CARRETA DE LEYES\n${"=".repeat(40)}\nAutor: ${report.userName}\nSemana: ${report.weekDate}\n\n${content}\n\n${DISCLAIMER}`
  };

  try {
    const response = await fetch(process.env.ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("[save-to-drive] Zapier status:", response.status);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Zapier respondió ${response.status}: ${body.substring(0, 100)}`);
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
  console.log(`🚀 Puerto ${PORT}`);
  console.log("✅ GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "cargada" : "❌ FALTA");
  console.log("✅ ZAPIER_WEBHOOK_URL:", process.env.ZAPIER_WEBHOOK_URL ? "cargada" : "❌ FALTA");
  console.log("✅ ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD ? "cargada" : "❌ FALTA");

  // Mantener el servidor despierto en Render (se pinga a sí mismo cada 10 min)
  setInterval(() => {
    fetch(`https://carreta-backend.onrender.com/api/ping`)
      .then(() => console.log("🏓 Ping para mantenerse despierto"))
      .catch(() => {});
  }, 10 * 60 * 1000);
});
