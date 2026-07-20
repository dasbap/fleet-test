/**
 * Génère DEMO-CREDENTIALS.pdf à partir du contenu aligné sur DEMO-CREDENTIALS.md
 */
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
doc.text("Identifiants démo E-Samba", 14, y);
y += 10;

doc.setFontSize(10);
const intro =
  "Comptes créés par le script supabase/create-demo-organization-complete.sql pour la démonstration.";
doc.text(doc.splitTextToSize(intro, 182), 14, y);
y += 14;

doc.setFontSize(12);
doc.text("Mot de passe commun", 14, y);
y += 7;
doc.setFontSize(10);
doc.text("Mot de passe (tous les comptes) : Demo2025!", 14, y);
y += 12;

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
doc.text("Connexion", 14, y);
y += 7;
doc.setFontSize(10);
const steps = [
  "1. Lancer l'application (ex. npm run dev).",
  "2. Aller sur la page de connexion.",
  "3. Saisir l'email du compte (ex. demo.organizer@esamba.test) et le mot de passe Demo2025!.",
];
steps.forEach((line) => {
  doc.text(doc.splitTextToSize(line, 182), 14, y);
  y += 6;
});
y += 4;

doc.setFontSize(12);
doc.text("Sécurité", 14, y);
y += 7;
doc.setFontSize(10);
const bullets = [
  "À utiliser uniquement en environnement de démo/test.",
  "Ne pas utiliser ce mot de passe en production.",
  "Les comptes @esamba.test sont destinés aux jeux de données de démonstration (voir aussi NETTOYAGE-BASE-DONNEES.md).",
];
bullets.forEach((line) => {
  doc.text(doc.splitTextToSize("• " + line, 178), 18, y);
  y += doc.getTextDimensions(doc.splitTextToSize(line, 170)).h + 4;
});

const buf = doc.output("arraybuffer");
writeFileSync(outPath, Buffer.from(buf));
console.log("PDF créé :", outPath);
