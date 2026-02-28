const express = require("express");
constante cors = require("cors");
constante { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("./base de datos");
requerir("dotenv").config();

constante aplicación = express();
const PUERTO = proceso.env.PUERTO || 3001;
constante genAI = nuevo GoogleGenerativeAI(proceso.env.GEMINI_API_KEY);
modelo constante = genAI.getGenerativeModel({ modelo: "gemini-2.0-flash" });

const DISCLAIMER = "Las opiniones expresadas son personales y no representan la posición de La Carreta de Leyes.";
const TAGS = ["Educación","Seguridad","Economía","Agro","Pensiones","Salud","Política Exterior","Trabajo","Medioambiente","Tecnología","Corrupción"];

aplicación.use(cors());
aplicación.use(express.json());

// Endpoint para mantener el servidor despierto
aplicación.get("/api/ping", (req, res) => res.json({ ok: true }));

función asíncrona gemini(prompt) {
  const resultado = await modelo.generateContent(prompt);
  devolver resultado.respuesta.texto();
}

función asíncrona shortenUrl(url) {
  intentar {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    constante corta = esperar res.text();
    devolver short.startsWith("https://tinyurl.com") ? short : url;
  } catch { devolver url; }
}

// USUARIOS
aplicación.get("/api/usuarios", (req, res) => {
  res.json(db.prepare("SELECCIONAR * DE usuarios ORDENAR POR creado_en ASC").all());
});

aplicación.post("/api/usuarios", (req, res) => {
  const { nombre, area, emoji, rol = "empleado" } = req.body;
  if (!name) return res.status(400).json({ error: "Nombre requerido" });
  const existente = db.prepare("SELECT * FROM usuarios WHERE LOWER(nombre)=LOWER(?) AND rol='empleado'").get(nombre);
  si (existente) {
    db.prepare("ACTUALIZAR usuarios ESTABLECER área=?, emoji=? DONDE id=?").run(área, emoji, existente.id);
    devolver res.json({...existente, área, emoji });
  }
  const r = db.prepare("INSERTAR EN usuarios (nombre,área,emoji,rol) VALORES (?,?,?,?)").run(nombre, área, emoji, rol);
  res.json({ id: r.lastInsertRowid, nombre, área, emoji, rol });
});

aplicación.delete("/api/usuarios/:id", (req, res) => {
  constante { id } = req.params;
  const informes = db.prepare("SELECCIONAR id DE informes DONDE user_id=?").all(id);
  informes.paraCada(r => {
    db.prepare("SELECCIONAR id DE entradas DONDE report_id=?").all(r.id)
      .forEach(e => db.prepare("BORRAR DE fuentes DONDE entry_id=?").run(e.id));
    db.prepare("ELIMINAR DE entradas DONDE report_id=?").run(r.id);
  });
  db.prepare("ELIMINAR DE informes DONDE user_id=?").run(id);
  db.prepare("ELIMINAR DE usuarios DONDE id=?").run(id);
  res.json({ ok: verdadero });
});

// INFORMES
aplicación.get("/api/reports", (req, res) => {
  const informes = db.prepare("SELECCIONAR * DE informes ORDENAR POR id DESC").all();
  res.json(informes.map(r => ({
    ...r,
    entradas: db.prepare("SELECT * FROM entradas WHERE report_id=?").all(r.id).map(e => ({
      ...mi,
      etiquetas: e.tags ? JSON.parse(e.tags) : [],
      fuentes: db.prepare("SELECT url FROM fuentes WHERE entry_id=?").all(e.id).map(f => f.url)
    }))
  })));
});

app.post("/api/reports", (req, res) => {
  const { userId, nombreDeUsuario, áreaDeUsuario, fechaDeSemana, enviadoA las, entradas } = req.body;
  const r = db.prepare("INSERTAR EN informes (id_usuario,nombre_usuario,área_usuario,fecha_semana,enviado_a) VALORES (?,?,?,?,?)")
    .run(userId, nombreDeUsuario, áreaDeUsuario, fechaDeSemana, enviadoA las);
  entradas.forEach(e => {
    const er = db.prepare("INSERTAR EN entradas (report_id,titular,resumen,actores_clave,conclusion,tags) VALORES (?,?,?,?,?,?)")
      .run(r.lastInsertRowid, e.titular, e.resumen, e.actoresClave, e.conclusion, JSON.stringify(e.tags||[]));
    (e.fuentes||[]).filter(f=>f.trim()).forEach(url =>
      db.prepare("INSERTAR EN fuentes (id_entrada,url) VALORES (?,?)").run(er.lastInsertRowid, url)
    );
  });
  res.json({ id: r.lastInsertRowid });
});

aplicación.delete("/api/reports/:id", (req, res) => {
  constante { id } = req.params;
  db.prepare("SELECCIONAR id DE entradas DONDE report_id=?").all(id)
    .forEach(e => db.prepare("BORRAR DE fuentes DONDE entry_id=?").run(e.id));
  db.prepare("ELIMINAR DE entradas DONDE report_id=?").run(id);
  db.prepare("ELIMINAR DE informes DONDE id=?").run(id);
  res.json({ ok: verdadero });
});

// ENTRADAS DE ETIQUETAS
app.post("/api/entradas-de-etiquetas", async (req, res) => {
  const { entradas } = req.body;
  const Prompt = `Analiza cada entrada y asígnale 1-3 etiquetas del listado: ${TAGS.join(", ")}.
Responde SOLO JSON sin comillas invertidas ni explicaciones adicionales:
{"entradas":[{"id":"...","etiquetas":["Etiqueta1"]}]}
Entradas: ${JSON.stringify(entries.map(e => ({ id: e.id, text: `${e.titular}. ${e.resumen || ""}` })))}`;

  intentar {
    const txt = await gemini(prompt);
    console.log("[tag-entries] Respuesta Gemini:", txt.substring(0, 200));

    // Extrae el JSON aunque Gemini agregue texto alrededor
    constante jsonMatch = txt.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Gemini no devolvió JSON válido: " + txt.substring(0, 100));

    constante analizada = JSON.parse(jsonMatch[0]);
    entradas analizadas.paraCada(e =>
      db.prepare("ACTUALIZAR entradas ESTABLECER etiquetas=? DONDE id=?").run(JSON.stringify(e.tags), e.id)
    );
    res.json(analizado);
  } atrapar (err) {
    console.error("[entradas-de-etiqueta] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GENERAR WHATSAPP
aplicación.post("/api/generar-whatsapp", async (req, res) => {
  const { informes } = req.body;
  intentar {
    para (const r de informes)
      para (constante e de r.entradas)
        e.fuentesCortas = await Promesa.all((e.fuentes||[]).filter(f=>f.trim()).map(shortenUrl));

    líneas constantes = informes.flatMap(r => r.entradas.flatMap(e => [
      `- Titular: ${e.titular}`,
      e.resumen && `Resumen: ${e.resumen}`,
      e.actoresClave && ` Actores: ${e.actoresClave}`,
      e.conclusión && `Análisis: ${e.conclusión}`
    ].filter(Booleano)));

    const fuentesPorEntrada = reports.flatMap(r =>
      r.entries.map(e => `- ${e.titular}: ${e.fuentesCortas?.join(", ")||"Sin fuentes"}`)
    ).join("\n");

    const autores = [...new Set(reports.map(r=>r.userName))].join(", ");
    const txt = await gemini(`Redacta un boletín político para WhatsApp en español.
REGLAS:
- Emojis moderados, formato WhatsApp (*negrita*, _cursiva_)
- Secciones claras, no te pierdas contexto político
- Fuentes inmediatamente debajo de cada nota: 🔗 https://tinyurl.com/...
- NO sección de fuentes al final
- NO menciones etiquetas
- Penúltima línea: "⚖️ _${DISCLAIMER}_"
- Última línea: "✍️ _Análisis: ${autores}_"
- Solo el texto, sin explicaciones.

MONITOREO:
${líneas.join("\n")}

FUENTES POR ENTRADA:
${fuentesPorEntrada}`);
    res.json({ mensaje: txt.trim() });
  } catch(err) {
    console.error("[generate-whatsapp] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GUARDAR EN LA UNIDAD
app.post("/api/guardar-en-unidad", async (req, res) => {
  const { informe } = req.body;

  // Validación temprana de la variable de entorno
  si (!proceso.env.ZAPIER_WEBHOOK_URL) {
    console.error("[save-to-drive] ZAPIER_WEBHOOK_URL no está definido en las variables de entorno");
    return res.status(500).json({ error: "ZAPIER_WEBHOOK_URL no configurado en el servidor" });
  }

  contenido constante = informe.entradas.mapa((e, i) =>
    `#${i + 1} ${e.titular}\nResumen: ${e.resumen || "—"}\nActores: ${e.actoresClave || "—"}\nConclusión: ${e.conclusión || "—"}\nFuentes: ${(e.fuentes || []).join(", ") || "—"}\nTemas: ${(e.tags || []).join(", ") || "Sin clasificar"}`
  ).join("\n\n---\n\n");

  carga útil constante = {
    Nombre del archivo: `Reporte_${report.userName.replace(/ /g, "_")}_${report.weekDate}.txt`,
    autor: report.userName,
    área: informe.áreaUsuario,
    semana: informe.semanaFecha,
    entriesCount: informe.entradas.longitud,
    contenido: `LA CARRETA DE LEYES\n${"=".repeat(40)}\nAutor: ${report.userName}\nSemana: ${report.weekDate}\n\n${content}\n\n${DESCARGO DE RESPONSABILIDAD}`
  };

  intentar {
    respuesta constante = esperar búsqueda(proceso.env.ZAPIER_WEBHOOK_URL, {
      método: "POST",
      encabezados: { "Content-Type": "application/json" },
      cuerpo: JSON.stringify(carga útil)
    });

    console.log("[guardar en la unidad] Estado de Zapier:", response.status);

    si (!respuesta.ok) {
      const cuerpo = esperar respuesta.texto();
      lanzar nuevo Error(`Zapier respondió ${response.status}: ${body.substring(0, 100)}`);
    }

    res.json({ ok: verdadero });
  } atrapar (err) {
    console.error("[guardar en unidad] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// AUTORIZACIÓN DE ADMINISTRACIÓN
aplicación.post("/api/admin-auth", (req, res) => {
  req.body.password === proceso.env.ADMIN_PASSWORD
    ? res.json({ ok: verdadero })
    : res.status(401).json({ error: "Clave incorrecta" });
});

aplicación.listen(PUERTO, () => {
  console.log(`🚀 Puerto ${PORT}`);
  console.log("✅ GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "cargada" : "❌ FALTA");
  console.log("✅ ZAPIER_WEBHOOK_URL:", process.env.ZAPIER_WEBHOOK_URL ? "cargada" : "❌ FALTA");
  console.log("✅ ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD ? "cargada" : "❌ FALTA");
});
