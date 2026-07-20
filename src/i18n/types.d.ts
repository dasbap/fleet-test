/**
 * Types des ressources i18n (alignés sur les fichiers public/locales par langue, ex. common.json).
 */
import "i18next";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: {
        nav: {
          dashboard: string;
          fleet: string;
          maintenance: string;
          alerts: string;
          reports: string;
          settings: string;
        };
        actions: {
          add: string;
          edit: string;
          delete: string;
          save: string;
          cancel: string;
          confirm: string;
          back: string;
          next: string;
          close: string;
          plan: string;
          resolve: string;
          export: string;
          search: string;
        };
        status: {
          active: string;
          maintenance: string;
          inactive: string;
          resolved: string;
          pending: string;
          overdue: string;
        };
        severity: {
          critical: string;
          warning: string;
          info: string;
        };
        empty: {
          noVehicles: string;
          noAlerts: string;
          noMaintenance: string;
        };
        settingsPage: {
          title: string;
          description: string;
          languageSectionTitle: string;
          languageSectionDescription: string;
        };
        languageSwitcher: {
          ariaLabel: string;
        };
        loading: string;
        error: string;
      };
      fleet: {
        title: string;
        vehicle: string;
        plate: string;
        brand: string;
        model: string;
        year: string;
        mileage: string;
        driver: string;
        addVehicle: string;
        vehicleDetail: string;
        totalFleet: string;
        totalFleet_other: string;
      };
      maintenance: {
        title: string;
        scheduled: string;
      };
      alerts: {
        title: string;
        none: string;
      };
      help: Record<string, unknown>;
    };
  }
}
