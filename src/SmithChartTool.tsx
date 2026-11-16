import { ExternalLink, RadioTower } from 'lucide-react';

const SMITH_CHART_URL = 'https://onlinesmithchart.com/';

export default function SmithChartTool() {
  return (
    <section className="circuit-card overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-2">
          <RadioTower className="h-5 w-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Smith Chart</h3>
        </div>
        <a href={SMITH_CHART_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
          Open full chart <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
      <p className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
        Explore impedance matching, components, reflection coefficient, and VSWR in the interactive chart.
      </p>
      <iframe
        title="Online Smith Chart interactive tool"
        src={SMITH_CHART_URL}
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
        className="block h-[820px] w-full border-t border-stone-200 bg-white dark:border-slate-800"
      />
      <p className="border-t border-stone-200 px-5 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Chart provided by <a href={SMITH_CHART_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 hover:underline dark:text-cyan-400">Online Smith Chart</a>.
        If the embedded view does not load, use Open full chart.
      </p>
    </section>
  );
}
