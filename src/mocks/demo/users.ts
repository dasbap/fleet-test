import type { AppRole } from "@/types/auth";

/**
 * Utilisateurs démo — noms crédibles, téléphones Sénégal +221.
 */
export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: AppRole;
  jobTitle: string;
}

export const MOCK_DEMO_USERS: DemoUser[] = [
  {
    id: "usr-01",
    email: "cheikh.sy@esamba.sn",
    fullName: "Cheikh Sy",
    phone: "+221771112233",
    role: "organizer",
    jobTitle: "Directeur d’exploitation",
  },
  {
    id: "usr-02",
    email: "marie.diop@esamba.sn",
    fullName: "Marie Diop",
    phone: "+221776665544",
    role: "manager",
    jobTitle: "Responsable flotte",
  },
  {
    id: "usr-03",
    email: "ibrahima.fall@esamba.sn",
    fullName: "Ibrahima Fall",
    phone: "+221784443322",
    role: "mechanic",
    jobTitle: "Chef d’atelier",
  },
  {
    id: "usr-04",
    email: "fatou.ndiaye@esamba.sn",
    fullName: "Fatou Ndiaye",
    phone: "+221763334455",
    role: "mechanic",
    jobTitle: "Mécanicien terrain",
  },
  {
    id: "usr-05",
    email: "amadou.diallo@esamba.sn",
    fullName: "Amadou Diallo",
    phone: "+221770011223",
    role: "driver",
    jobTitle: "Conducteur VL / fourgon",
  },
  {
    id: "usr-06",
    email: "pape.ndiaye@esamba.sn",
    fullName: "Pape Ndiaye",
    phone: "+221781122334",
    role: "driver",
    jobTitle: "Conducteur poids lourd",
  },
  {
    id: "usr-07",
    email: "aissatou.ba@esamba.sn",
    fullName: "Aïssatou Ba",
    phone: "+221775566778",
    role: "driver",
    jobTitle: "Conductrice VL",
  },
  {
    id: "usr-08",
    email: "ibrahima.sarr@esamba.sn",
    fullName: "Ibrahima Sarr",
    phone: "+221769988776",
    role: "driver",
    jobTitle: "Conducteur pick-up",
  },
  {
    id: "usr-09",
    email: "ousmane.kane@esamba.sn",
    fullName: "Ousmane Kane",
    phone: "+221772009988",
    role: "driver",
    jobTitle: "Conducteur minibus",
  },
  {
    id: "usr-10",
    email: "moussa.camara@esamba.sn",
    fullName: "Moussa Camara",
    phone: "+221778877665",
    role: "manager",
    jobTitle: "Planificateur missions",
  },
  {
    id: "usr-11",
    email: "awa.seye@esamba.sn",
    fullName: "Awa Seye",
    phone: "+221774455667",
    role: "organizer",
    jobTitle: "Responsable conformité",
  },
  {
    id: "usr-12",
    email: "lamine.touré@esamba.sn",
    fullName: "Lamine Touré",
    phone: "+221779900112",
    role: "mechanic",
    jobTitle: "Technicien diagnostic",
  },
];

export function getDemoUserById(id: string): DemoUser | undefined {
  return MOCK_DEMO_USERS.find((u) => u.id === id);
}
