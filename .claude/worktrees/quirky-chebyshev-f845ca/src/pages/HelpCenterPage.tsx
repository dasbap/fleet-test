import { HelpFAQ, HelpSearch } from "@/components/shared/HelpCenter";

const HelpCenterPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-heading font-semibold text-slate-800 dark:text-slate-100">
          Centre d&apos;aide E-Samba
        </h1>
        <p className="text-sm text-slate-400">
          Recherchez une question ou parcourez les réponses les plus utiles
          selon la page que vous utilisez.
        </p>
      </header>

      <HelpSearch autoFocus />

      <section>
        <HelpFAQ />
      </section>
    </div>
  );
};

export default HelpCenterPage;

