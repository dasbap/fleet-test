export type JobAvailability = "immediate" | "m3" | "m5" | "t4_2026";

export type JobCommercialSegment = "taxis" | "pme";

export interface JobResponsibility {
  domain: string;
  detail: string;
}

export interface JobTargetTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface JobScheduleRow {
  time: string;
  activity: string;
}

export interface JobPosting {
  id: string;
  title: string;
  contract: string;
  location: string;
  availability: JobAvailability;
  availabilityLabel: string;
  mission: string;
  context: string;
  responsibilities: JobResponsibility[];
  skills: string[];
  generalSkills: string[];
  education: string[];
  conditions: string[];
  kpis: string[];
  evolution: string;
  priority: "immediate" | "upcoming";
  headcountLabel?: string;
  languages?: string[];
  targetTables?: JobTargetTable[];
  schedule?: JobScheduleRow[];
  segment?: JobCommercialSegment;
}
