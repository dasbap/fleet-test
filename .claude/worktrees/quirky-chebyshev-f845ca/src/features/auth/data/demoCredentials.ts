export interface DemoCredentialAccount {
  role: string;
  email: string;
}

export const DEMO_SHARED_PASSWORD = "Demo2025!";

export const DEMO_CREDENTIAL_ACCOUNTS: DemoCredentialAccount[] = [
  { role: "Organizer", email: "demo.organizer@esamba.test" },
  { role: "Manager 1", email: "demo.manager1@esamba.test" },
  { role: "Manager 2", email: "demo.manager2@esamba.test" },
  { role: "Driver 1", email: "demo.driver1@esamba.test" },
  { role: "Driver 2", email: "demo.driver2@esamba.test" },
  { role: "Mechanic 1", email: "demo.mechanic1@esamba.test" },
];
