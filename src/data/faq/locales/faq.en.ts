/**
 * FAQ E-Samba — English content
 */

import type { FaqRegistry } from '@/types/faq';
import { SUPPORT } from '@/config/navigation';

export const faqEn: FaqRegistry = {
  dashboard: {
    en: [
      {
        id: 'dash-overview',
        question: 'What can I see on the dashboard?',
        answer:
          'The dashboard shows a real-time summary of your fleet: active vehicles, ongoing alerts, average mileage, availability rate, and your drivers\' latest activity.',
        tags: ['dashboard', 'overview', 'fleet', 'summary'],
      },
      {
        id: 'dash-refresh',
        question: 'How often is the data updated?',
        answer:
          'Key indicators are refreshed every 5 minutes. Critical alerts are delivered in real time via push notifications.',
        tags: ['update', 'real-time', 'frequency'],
      },
      {
        id: 'dash-kpi',
        question: 'How do I customize the displayed KPIs?',
        answer:
          'Click the "Configure" icon in the top right of the dashboard. You can choose up to 8 indicators from available metrics and reorder blocks by drag and drop.',
        tags: ['KPI', 'customize', 'metrics'],
      },
      {
        id: 'dash-export',
        question: 'Can I export dashboard data?',
        answer:
          'Yes, the "Export" button generates a PDF or CSV report for the selected period. Exports are available on Standard and Pro plans.',
        tags: ['export', 'PDF', 'CSV', 'report'],
      },
      {
        id: 'dash-mobile',
        question: 'Is the dashboard accessible on mobile?',
        answer:
          'Yes, E-Samba is mobile-first. The web app adapts to all screen sizes. A native iOS/Android app is also available.',
        tags: ['mobile', 'app', 'responsive'],
      },
    ],
  },

  billing: {
    en: [
      {
        id: 'bill-plans',
        question: 'What subscription plans are available?',
        answer:
          'E-Samba offers four plans: Free (up to 3 vehicles), Starter (up to 25 vehicles), Pro (up to 100 vehicles), and Enterprise (unlimited fleet). Each paid plan includes a 7-day free trial.',
        tags: ['subscription', 'pricing', 'plan'],
      },
      {
        id: 'bill-payment',
        question: 'What payment methods are accepted?',
        answer:
          'We accept Orange Money, MTN Mobile Money, Wave, Visa/Mastercard cards, and bank transfers for Pro fleets. All payments are secure and encrypted.',
        tags: ['payment', 'Orange Money', 'MTN', 'Wave', 'card'],
      },
      {
        id: 'bill-invoice',
        question: 'How do I access my invoices?',
        answer:
          'Your invoices are available in Settings → Billing → History. They can be downloaded as PDF and are automatically emailed to you each month.',
        tags: ['invoice', 'history', 'email', 'download'],
      },
      {
        id: 'bill-cancel',
        question: 'How do I cancel my subscription?',
        answer:
          'You can cancel at any time from Settings → Billing → Manage Subscription. You retain access until the end of the current period with no cancellation fees.',
        tags: ['cancel', 'subscription', 'termination'],
      },
      {
        id: 'bill-upgrade',
        question: 'How do I upgrade to a higher plan?',
        answer:
          'Click "Upgrade" on the dashboard or in Settings → Billing. The change takes effect immediately and you only pay the prorated amount for the current month.',
        tags: ['upgrade', 'plan', 'billing'],
      },
    ],
  },

  drivers: {
    en: [
      {
        id: 'drv-add',
        question: 'How do I add a driver to my fleet?',
        answer:
          'Go to Drivers → Add, enter the name, license number, and contact. The driver receives an SMS or email invitation to activate their E-Samba mobile account.',
        tags: ['add', 'driver', 'invite', 'account'],
      },
      {
        id: 'drv-assign',
        question: 'How do I assign a vehicle to a driver?',
        answer:
          'Open the driver profile → Assign Vehicle → select an available vehicle. The assignment is timestamped and recorded in the history log.',
        tags: ['assign', 'vehicle', 'assignment'],
      },
      {
        id: 'drv-perf',
        question: 'How do I track a driver\'s performance?',
        answer:
          'The driver profile shows the driving score (based on DVIRs, fuel consumption, and reported incidents), cumulative mileage, and attendance rate.',
        tags: ['performance', 'score', 'track', 'DVIR'],
      },
      {
        id: 'drv-dvir',
        question: 'What is a DVIR?',
        answer:
          'A DVIR (Driver Vehicle Inspection Report) is a daily pre/post-trip check the driver performs on the mobile app. It documents the vehicle\'s condition and triggers alerts if defects are found.',
        tags: ['DVIR', 'inspection', 'pre-trip'],
      },
      {
        id: 'drv-license',
        question: 'What happens when a driver\'s license expires?',
        answer:
          'E-Samba sends alerts 30, 14, and 7 days before expiration. At expiration, the driver is automatically flagged as "non-compliant" and can no longer be assigned to a trip.',
        tags: ['license', 'expiry', 'alert', 'compliance'],
      },
    ],
  },

  fuel: {
    en: [
      {
        id: 'fuel-log',
        question: 'How do I log a fuel fill-up?',
        answer:
          'Go to Fuel → New Fill-up, select the vehicle, enter the volume (litres), total cost, and station. Drivers can also log it from the mobile app with a photo of the receipt.',
        tags: ['fill-up', 'log', 'fuel', 'receipt'],
      },
      {
        id: 'fuel-fraud',
        question: 'How does E-Samba detect fuel fraud?',
        answer:
          'E-Samba compares declared consumption with theoretical consumption based on mileage driven and the vehicle model. Discrepancies over 15% generate a "suspected fraud" alert.',
        tags: ['fraud', 'detection', 'anomaly', 'alert'],
      },
      {
        id: 'fuel-report',
        question: 'Can I generate a monthly fuel consumption report?',
        answer:
          'Yes, in Fuel → Reports, choose the period and scope. The report can be exported as PDF or Excel.',
        tags: ['report', 'monthly', 'consumption', 'export'],
      },
    ],
  },

  vehicles: {
    en: [
      {
        id: 'veh-add',
        question: 'How do I add a vehicle to my fleet?',
        answer:
          'In Vehicles → Add, enter the registration plate, model, year, and current mileage. You can scan the registration card\'s QR code to pre-fill the information.',
        tags: ['add', 'vehicle', 'registration', 'QR'],
      },
      {
        id: 'veh-qr',
        question: 'What is the vehicle QR code used for?',
        answer:
          'The E-Samba QR code is placed on the windshield. By scanning it, the driver directly accesses the vehicle profile, starts the DVIR, and views the maintenance history.',
        tags: ['QR code', 'scan', 'windshield', 'profile'],
      },
    ],
  },

  maintenance: {
    en: [
      {
        id: 'maint-create',
        question: 'How do I create a work order?',
        answer:
          'In Maintenance → New Order, select the vehicle, work type, and provider. The order is automatically sent to the fleet manager.',
        tags: ['work order', 'repair', 'service', 'provider'],
      },
      {
        id: 'maint-predict',
        question: 'How does predictive maintenance work?',
        answer:
          'E-Samba analyses mileage, vehicle age, and intervention history to anticipate upcoming services. Alerts are sent 500 km before scheduled milestones.',
        tags: ['predictive', 'AI', 'anticipation', 'service'],
      },
    ],
  },

  transit: {
    en: [
      {
        id: 'trn-corridor',
        question: 'Which CEMAC corridors are covered?',
        answer:
          'E-Samba covers the main transit corridors in the CEMAC zone: Douala–N\'Djamena, Douala–Bangui, Libreville–Brazzaville, and cross-border links between CM/TD/CF/CG/GA/GQ.',
        tags: ['corridor', 'CEMAC', 'transit', 'customs'],
      },
    ],
  },

  alerts: {
    en: [
      {
        id: 'alrt-types',
        question: 'What types of alerts does E-Samba generate?',
        answer:
          'E-Samba manages four alert levels: Critical (breakdown, accident), High (expired document), Medium (maintenance due), and Low (scheduled reminder).',
        tags: ['alert', 'type', 'critical', 'breakdown'],
      },
    ],
  },

  generic: {
    en: [
      {
        id: 'gen-esamba',
        question: 'What is E-Samba?',
        answer:
          'E-Samba is a smart fleet management SaaS designed for Central Africa (CEMAC zone). It centralises vehicle, driver, fuel, maintenance, and customs transit management.',
        tags: ['E-Samba', 'overview', 'SaaS', 'fleet'],
      },
      {
        id: 'gen-start',
        question: 'How do I get started with E-Samba?',
        answer:
          'Create your account, add your first vehicles and drivers, then invite your team. The interactive onboarding guide walks you through every step.',
        tags: ['start', 'guide', 'account', 'onboarding'],
      },
      {
        id: 'gen-support',
        question: 'How do I contact E-Samba support?',
        answer:
          `Support is available via live chat (Mon–Fri, 8am–6pm WAT), email at ${SUPPORT.email}, or WhatsApp.`,
        tags: ['support', 'contact', 'help', 'chat', 'email'],
      },
      {
        id: 'gen-security',
        question: 'Is my data secure?',
        answer:
          'Yes, E-Samba hosts your data on ISO 27001-certified servers with AES-256 encryption. Access is protected by multi-factor authentication and role-based access control (RBAC).',
        tags: ['security', 'data', 'encryption', 'RBAC'],
      },
    ],
  },
};
