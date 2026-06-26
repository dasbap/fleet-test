import {
  CARRIERES_COMMERCIAL_RECOMMENDATION,
  CARRIERES_COMMERCIAL_SYNTHESIS_ROWS,
} from "@/data/marketing/carrieres-commercial-synthese";

export function CommercialRolesSynthesis() {
  return (
    <div className="mb-8 space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">
                Critère
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">
                Poste A — Taxis/VTC
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">
                Poste B — PME/Institutions
              </th>
            </tr>
          </thead>
          <tbody>
            {CARRIERES_COMMERCIAL_SYNTHESIS_ROWS.map((row) => (
              <tr key={row.criterion} className="border-b border-border last:border-0">
                <th
                  scope="row"
                  className="px-4 py-3 text-left font-medium text-foreground align-top"
                >
                  {row.criterion}
                </th>
                <td className="px-4 py-3 text-muted-foreground align-top">{row.posteA}</td>
                <td className="px-4 py-3 text-muted-foreground align-top">{row.posteB}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {CARRIERES_COMMERCIAL_RECOMMENDATION}
      </p>
    </div>
  );
}
