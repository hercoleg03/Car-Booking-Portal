import jsPDF from "jspdf";

interface ContrattoData {
  numero: string;
  tipo: string;
  dataContratto: string;
  importo: number | null;
  note: string | null;
  prenotazioneId?: number | null;
  dataInizio?: string | null;
  dataFine?: string | null;
  cliente: {
    nome: string;
    cognome: string;
    codiceFiscale?: string | null;
    telefono?: string | null;
    indirizzo?: string | null;
    email?: string | null;
  };
  vettura: {
    marca: string;
    modello: string;
    targa?: string | null;
    km?: number | null;
    carburante?: string | null;
  };
}

function blank(label = "") {
  return label ? `${label} ___________________` : "___________________";
}

function formatDate(iso: string) {
  if (!iso) return "___/___/______";
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatEuro(v: number | null) {
  if (!v) return "___________________";
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function generaContrattoNoleggioPDF(c: ContrattoData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const L = 20;
  const R = 190;
  const W = R - L;

  let y = 18;

  // ── Header azienda ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 41);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Società Auto Le Rose srl", 105, 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 220);
  doc.text("Sede legale: Brescia, Via Milano n° 130  |  P.IVA e C.F. 03950330989", 105, 17, { align: "center" });
  doc.setTextColor(0, 0, 0);

  y = 36;

  // ── Titolo contratto ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CONTRATTO DI NOLEGGIO AUTOVETTURA SENZA CONDUCENTE", 105, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`N° ${c.numero}  —  Data: ${formatDate(c.dataContratto)}`, 105, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 9;

  // ── Linea separatore ────────────────────────────────────────────────────────
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(L, y, R, y);
  y += 6;

  // ── Intro ───────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const intro = `Scrittura privata, da valersi a tutti gli effetti di legge, tra i sottoscritti:`;
  doc.text(intro, L, y);
  y += 7;

  // Noleggiante
  doc.setFont("helvetica", "bold");
  doc.text("• Società Auto Le Rose srl", L + 4, y);
  doc.setFont("helvetica", "normal");
  doc.text(" con sede legale in Brescia Via Milano n° 130, P.IVA e codice fiscale 03950330989", L + 4, y);
  y += 5;
  doc.text("  (di seguito indicato come noleggiante o noleggiatore)", L + 4, y);
  y += 6;
  doc.text("e", L, y);
  y += 6;

  // Utilizzatore
  const cf = c.cliente.codiceFiscale || "_".repeat(16);
  const tel = c.cliente.telefono || "___________________";
  const indirizzo = c.cliente.indirizzo || "___________________";

  doc.setFont("helvetica", "bold");
  doc.text("• Utilizzatore:", L + 4, y);
  doc.setFont("helvetica", "normal");
  y += 5;

  const utilizzatoreLines = [
    `Cognome: ${c.cliente.cognome || "___________________"}    Nome: ${c.cliente.nome || "___________________"}`,
    `Nato a: ___________________  il: ___________________  Residente in: ${indirizzo}`,
    `Codice Fiscale: ${cf}    Doc. N°: ___________________  Rilasciato: ___________________`,
    `Patente N°: ___________________  Rilasciata da: ___________________  Tel: ${tel}`,
    `(di seguito indicato come utilizzatore o cliente)`,
  ];
  for (const line of utilizzatoreLines) {
    doc.text(line, L + 4, y);
    y += 5;
  }

  y += 2;
  const premessa = `Che si impegnano a rispettarne l'intero contenuto e che le condizioni espresse potranno essere modificate solo con uno specifico accordo scritto e sottoscritto tra le parti. L'utilizzatore dichiara di aver fornito al noleggiatore dati reali ed utili alla propria identificazione anagrafica e che i documenti forniti sono originali e non contraffatti.`;
  const premessaLines = doc.splitTextToSize(premessa, W);
  doc.text(premessaLines, L, y);
  y += premessaLines.length * 4.5 + 4;

  // ── Articoli ────────────────────────────────────────────────────────────────
  function articolo(num: number, titolo: string, testo: string[]) {
    if (y > 262) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`${num}. ${titolo}`, L, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 5;
    for (const paragrafo of testo) {
      const lines = doc.splitTextToSize(paragrafo, W);
      doc.text(lines, L, y);
      y += lines.length * 4.5 + 1;
    }
    y += 3;
  }

  // Art 1 — Oggetto
  const targa = c.vettura.targa || "___________";
  const km = c.vettura.km ? c.vettura.km.toLocaleString("it-IT") + " km" : "___________";
  const carburante = c.vettura.carburante || "___________";
  const modello = `${c.vettura.marca} ${c.vettura.modello}`.trim() || "___________";

  articolo(1, "Oggetto del contratto",
    [
      `La società noleggiante concede in noleggio al cliente il veicolo indicato nel presente contratto — Autovettura: ${modello} — targa: ${targa}, KM ${km}, CARBURANTE: ${carburante}.`,
      `L'autovettura oggetto del presente contratto, salvo preventiva autorizzazione scritta da parte del noleggiante, potrà avere anche i seguenti autisti:`,
      `— __________________________________________________________________________`,
    ]
  );

  articolo(2, "Equipaggiamento",
    ["Il veicolo è consegnato con una ruota di scorta ovvero kit di riparazione, autoradio, copia carta di circolazione. L'autovettura viene consegnata con il carburante sopra indicato, e dovrà essere restituita con la medesima quantità. Al rientro verranno addebitati eventuali litri mancanti oltre ad un supplemento per il mancato rifornimento pari ad euro 30."]
  );

  const dataInizioStr = c.dataInizio ? formatDate(c.dataInizio.split("T")[0]) : "___/___/______";
  const dataFineStr = c.dataFine ? formatDate(c.dataFine.split("T")[0]) : "___/___/______";

  articolo(3, "Inizio, consegna e restituzione del veicolo",
    [
      `Il noleggio ha inizio il: ${dataInizioStr}  alle ore: ______  ed ha termine il giorno: ${dataFineStr}  alle ore: ______.`,
      "Al termine del periodo di noleggio il bene deve essere messo a disposizione del noleggiatore. In caso di ritardo nella consegna del bene il cliente si impegna a pagare euro 100 per ogni giorno di ritardo al fine anche di compensare la mancata disponibilità a noleggiare nuovamente l'autovettura non riconsegnata.",
    ]
  );

  articolo(4, "Estensione del noleggio",
    ["Qualora il Cliente desideri modificare i termini della restituzione lo stesso dovrà ottenere il preventivo consenso scritto del noleggiatore ovvero in caso di necessità anche telefonicamente facendone richiesta entro 24 ore della prevista restituzione del veicolo."]
  );

  articolo(5, "Stato dell'autovettura",
    ["Il veicolo si trova in perfetto stato di efficienza, perfettamente funzionante, con il serbatoio di carburante pieno e con la dotazione di tutti i documenti previsti dalla legge per la circolazione stradale e con polizze assicurative in corso di validità. L'utilizzatore è tenuto a conservare e custodire l'autovettura e la documentazione affidatagli con cura e correttezza. Il Cliente si obbliga a riconsegnare il veicolo nelle stesse condizioni in cui lo ha ricevuto. Il Cliente dichiara che il veicolo visionato prima della consegna non presenta graffi o lesioni alla carrozzeria e alle parti interne del veicolo oltre a quelli eventualmente segnalati con una specifica nota scritta nel corpo dello stesso contratto dal noleggiante."]
  );

  articolo(6, "Uso dell'autovettura",
    [
      "L'utilizzatore dichiara che il veicolo consegnato è idoneo all'uso convenuto con il noleggiatore. Il veicolo non potrà mai essere condotto:",
      "— sotto l'influsso di alcool o droghe;\n— da persona sprovvista di patente o con validità scaduta;\n— fuori strada o su strade inadatte;\n— per recarsi all'estero salva preventiva autorizzazione scritta dal noleggiante.",
    ]
  );

  articolo(7, "Circolazione",
    ["Il Cliente è responsabile personalmente delle infrazioni commesse alle normative del Codice della Strada ed al mancato pagamento di pedaggi autostradali e sarà tenuto al rimborso, per l'intero ammontare, delle relative sanzioni e spese più addebito di euro 30 (trenta) per la gestione amministrativa delle pratiche."]
  );

  articolo(8, "Corrispettivo noleggio",
    [
      `Per il bene noleggiato è dovuto al noleggiatore un corrispettivo pari ad ${formatEuro(c.importo)} pagato in: ${blank()} (sono compresi nel corrispettivo GIORNALIERO n°: ______ km) verranno addebitati euro 0,30 per ogni km in più.`,
      `Al momento della stipula viene versata una caparra di: ${blank()}`,
      "L'utilizzatore si impegna a corrispondere all'incaricato del noleggiatore al termine del noleggio quanto dovuto in base al presente contratto. Nel caso in cui l'utilizzatore non paghi la quota di noleggio, il presente contratto si intenderà automaticamente risolto e l'utilizzatore si obbliga a riconsegnare al noleggiatore il bene. Il noleggiatore tratterrà le somme incassate a titolo di penale.",
    ]
  );

  articolo(9, "Proprietà del bene noleggiato",
    ["La proprietà dell'autoveicolo e degli eventuali accessori rimane sempre e comunque in capo al noleggiatore e l'utilizzatore riconosce che non potrà mai in nessun modo vantare alcun diritto di proprietà. È fatto divieto per l'utilizzatore di sub noleggiare, ipotecare, costituire l'autoveicolo in pegno o garanzia sotto qualsiasi forma. L'utilizzatore si obbliga a conservare all'interno dell'autoveicolo copia del presente contratto e ad esibirla alle Autorità Competenti."]
  );

  articolo(10, "Riparazioni",
    ["In caso di guasto, malfunzionamento o difetto l'utilizzatore non dovrà utilizzare l'autoveicolo. L'utilizzatore è tenuto a comunicare immediatamente al noleggiante il fatto. Nel caso in cui si verifichi una necessità urgente alle riparazioni potrà provvedervi l'utilizzatore solo ed esclusivamente dietro preventiva autorizzazione scritta del noleggiante. Il Cliente si impegna a non apportare alcuna modifica al veicolo noleggiato."]
  );

  articolo(11, "Copertura assicurativa",
    ["L'autovettura è coperta dalla seguente garanzia assicurativa: _____________________________________________. La copia della polizza assicurativa è stata visionata dall'utilizzatore che dichiara di essere ben consapevole dei massimali coperti, delle franchigie e delle scoperture che resterebbero a suo esclusivo carico."]
  );

  articolo(12, "Responsabilità",
    ["Il Cliente sarà responsabile di qualsiasi danno subito dal veicolo durante il noleggio, salve le ipotesi di caso fortuito e forza maggiore. In caso di mancata restituzione delle chiavi della vettura dovuta a smarrimento si concorda un risarcimento pari ad euro 700,00."]
  );

  articolo(13, "Ammende e contravvenzioni",
    ["Sono a carico dell'utilizzatore le ammende e le contravvenzioni per infrazioni al Codice della Strada del veicolo commesse durante il periodo di noleggio."]
  );

  articolo(14, "Facoltà di recesso",
    ["Resta salva la facoltà dell'utilizzatore di recedere in qualsiasi momento per qualsiasi motivo dal noleggio. In questo caso l'utilizzatore si impegna a restituire il bene oggetto del presente contratto di noleggio."]
  );

  articolo(15, "Riservatezza",
    ["Entrambe le parti si impegnano a mantenere la segretezza delle informazioni relativamente all'attività dell'altra parte. Tale obbligo di riservatezza non troverà applicazione in relazione a quelle informazioni che siano divenute di pubblico dominio. Il tutto nel rispetto di quanto previsto dal D.Lgs. 30 giugno 2003, n. 196."]
  );

  articolo(16, "Legge applicabile",
    ["Il presente contratto è disciplinato dalla legge italiana. Per quanto non espressamente previsto si applicano le norme del Codice civile, ed in particolare le norme previste dall'art. 1571 c.c. e seguenti."]
  );

  articolo(17, "Foro competente",
    ["In caso di controversie inerenti all'esecuzione del presente contratto, sarà esclusivamente e inderogabilmente competente il Foro di Brescia."]
  );

  articolo(18, "Disposizioni generali",
    [
      "Qualsiasi modifica al presente contratto dovrà essere fatta per iscritto e sottoscritta da entrambe le parti a pena di nullità. Per quanto non espressamente previsto nel presente contratto, si fa rinvio al Codice Civile, alle disposizioni legislative e regolamentari, nazionali e comunitarie vigenti in materia.",
      c.note ? `Note aggiuntive: ${c.note}` : "",
    ].filter(Boolean)
  );

  // ── Firme ───────────────────────────────────────────────────────────────────
  if (y > 245) { doc.addPage(); y = 18; }
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Letto, approvato e sottoscritto", L, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Luogo e data: Brescia il ${formatDate(c.dataContratto)}`, L, y);
  y += 12;

  const col1 = L;
  const col2 = 115;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text("l'utilizzatore", col1 + 20, y);
  doc.text("il noleggiatore", col2 + 15, y);
  y += 10;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(col1, y, col1 + 75, y);
  doc.line(col2, y, col2 + 75, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text(`${c.cliente.cognome} ${c.cliente.nome}`.trim(), col1, y + 4);
  doc.text("Società Auto Le Rose srl", col2, y + 4);
  doc.setTextColor(0, 0, 0);

  y += 16;

  // ── Sezione restituzione ────────────────────────────────────────────────────
  if (y > 250) { doc.addPage(); y = 18; }
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(L, y, R, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text("19. Materiale restituzione del veicolo", L, y);
  doc.setTextColor(0, 0, 0);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Il veicolo viene restituito in data _______________ alle ore _______", L, y);
  y += 7;
  doc.text("Vengono riscontrati i seguenti danni:", L, y);
  y += 6;
  doc.line(L, y, R, y); y += 7;
  doc.line(L, y, R, y); y += 7;
  doc.line(L, y, R, y); y += 12;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text("l'utilizzatore", col1 + 20, y);
  doc.text("il noleggiatore", col2 + 15, y);
  y += 10;
  doc.setDrawColor(80);
  doc.setLineWidth(0.3);
  doc.line(col1, y, col1 + 75, y);
  doc.line(col2, y, col2 + 75, y);

  // ── Footer pagine ───────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Contratto N° ${c.numero}  —  ${c.vettura.targa || ""}  —  Pagina ${i} di ${pages}`, 105, 293, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  const filename = `contratto_noleggio_${c.numero.replace(/\//g, "-")}_${c.vettura.targa || "vettura"}.pdf`;
  doc.save(filename);
}
