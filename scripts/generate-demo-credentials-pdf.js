import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outPath = path.join(rootDir, "DEMO-CREDENTIALS.pdf");

const doc = new jsPDF();
let y = 18;

doc.setFontSize(16);
doc.text("Accès démo E-Samba", 14, y);
y += 10;

doc.setFontSize(10);
const intro =
  "Les mots de passe ne sont pas intégrés au dépôt ni à ce document. Ils doivent être transmis séparément par un canal privé.";
doc.text(doc.splitTextToSize(intro, 182), 14, y);
y += 16;

doc.setFontSize(12);
doc.text("Comptes", 14, y);
y += 4;

autoTable(doc, {
  startY: y,
  head: [["Rôle", "Email"]],
  body: [
    ["Organizer", "demo.organizer@esamba.test"],
    ["Manager 1", "demo.manager1@esamba.test"],
    ["Manager 2", "demo.manager2@esamba.test"],
    ["Driver 1", "demo.driver1@esamba.test"],
    ["Driver 2", "demo.driver2@esamba.test"],
    ["Mechanic 1", "demo.mechanic1@esamba.test"],
  ],
  styles: { fontSize: 9 },
  headStyles: { fillColor: [55, 65, 81] },
  margin: { left: 14, right: 14 },
});

y = doc.lastAutoTable.finalY + 12;
doc.setFontSize(12);
doc.text("Sécurité", 14, y);
y += 7;
doc.setFontSize(10);
const bullets = [
  "Ne jamais inclure un mot de passe réel dans un document généré ou versionné.",
  "Utiliser DEMO_PASSWORD uniquement depuis un environnement local non versionné ou un gestionnaire de secrets CI.",
  "Considérer comme compromis tout ancien secret déjà publié dans l'historique Git et le remplacer avant utilisation distante.",
];

bullets.forEach((line) => {
  const wrapped = doc.splitTextToSize(`• ${line}`, 178);
  doc.text(wrapped, 18, y);
  y += doc.getTextDimensions(wrapped).h + 4;
});

const buf = doc.output("arraybuffer");
writeFileSync(outPath, Buffer.from(buf));
console.log("PDF créé :", outPath);
