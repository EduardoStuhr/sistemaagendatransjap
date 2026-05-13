import { Check, AlertTriangle, Clock, ChevronRight, RotateCcw } from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { fmtDatetime } from '../../utils/format.js';
import { Spinner } from '../ui/Spinner.jsx';

const STAGE_ORDER = [
  'solicitacao_aberta',
  'em_orcamento',
  'aguardando_aprovacao',
  'compra_pecas',
  'aguardando_entrega_pecas',
  'em_manutencao',
  'finalizado',
];

// Label do botão de avanço em cada etapa
const ADVANCE_LABELS = {
  solicitacao_aberta:       'Enviar para Orçamento',
  em_orcamento:             'Aguardando Aprovação',
  aguardando_aprovacao:     'Aprovar → Compra de Peças',
  compra_pecas:             'Peças Compradas → Aguardar Entrega',
  aguardando_entrega_pecas: 'Peças Recebidas → Iniciar Manutenção',
  em_manutencao:            'Manutenção Concluída → Finalizar',
  finalizado:               null,
};

function daysInStage(stage) {
  if (!stage.start) return null;
  const start = typeof stage.start === 'string' ? parseISO(stage.start) : stage.start;
  if (!isValid(start)) return null;
  const end = stage.end
    ? (typeof stage.end === 'string' ? parseISO(stage.end) : stage.end)
    : new Date();
  return Math.max(0, differenceInDays(end, start));
}

function getGargaloLevel(stage) {
  if (!stage.active) return null;
  const days = daysInStage(stage);
  if (days === null) return null;
  if (days > 5) return 'critical';
  if (days > 2) return 'warning';
  return null;
}

// ── Compact (mini-stepper) ──────────────────────────────────
export function MaintenanceStepperCompact({ task }) {
  const timings = task.maintenanceSummary?.stageTimings;
  if (!timings) return null;

  const currentIdx = STAGE_ORDER.indexOf(task.maintenanceSummary?.maintenanceStatus);

  return (
    <div className="flex items-center gap-0.5 py-1" aria-label="Progresso das etapas">
      {STAGE_ORDER.map((key, idx) => {
        const stage   = timings.find(s => s.key === key);
        const done    = stage?.days !== null && !stage?.active;
        const active  = stage?.active;
        const gargalo = active ? getGargaloLevel(stage) : null;

        let bg = 'bg-base-500';
        if (done)   bg = 'bg-success';
        if (active && gargalo === 'critical') bg = 'bg-danger animate-pulse';
        else if (active && gargalo === 'warning') bg = 'bg-orange animate-pulse';
        else if (active) bg = 'bg-brand-light';

        const label = stage?.label || key;
        const days  = active ? daysInStage(stage) : stage?.days;

        return (
          <div key={key} className="relative group flex items-center"
               title={`${label}${days != null ? ` — ${days}d` : ''}`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${bg}`} />
            {idx < STAGE_ORDER.length - 1 && (
              <div className={`w-3 h-px ${idx < currentIdx ? 'bg-success/60' : 'bg-base-500'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Full stepper ────────────────────────────────────────────
export function MaintenanceStepper({ task, isManager, onChangeStage, changing }) {
  const summary = task.maintenanceSummary;
  if (!summary) return null;

  const timings       = summary.stageTimings || [];
  const currentStage  = summary.maintenanceStatus;
  const currentIdx    = STAGE_ORDER.indexOf(currentStage);
  const prevStageKey  = currentIdx > 0 ? STAGE_ORDER[currentIdx - 1] : null;
  const nextStageKey  = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1
    ? STAGE_ORDER[currentIdx + 1]
    : null;

  // Worst gargalo for top banner
  let topGargalo = null;
  for (const stage of timings) {
    if (!stage.active) continue;
    const level = getGargaloLevel(stage);
    if (level === 'critical') { topGargalo = { stage, days: daysInStage(stage), level }; break; }
    if (level === 'warning' && !topGargalo) topGargalo = { stage, days: daysInStage(stage), level };
  }

  const totalOsDays = summary.totalMaintenanceDays
    ?? Math.max(0, differenceInDays(new Date(), parseISO(task.createdAt)));

  function advance() { if (nextStageKey && onChangeStage) onChangeStage(nextStageKey); }
  function revert()  { if (prevStageKey && onChangeStage) onChangeStage(prevStageKey); }

  return (
    <div className="rounded-2xl border border-base-500 bg-base-900 p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-base-200">Fluxo de manutenção</p>
          <p className="text-sm font-semibold text-base-50">{summary.maintenanceStatusLabel}</p>
        </div>
        {/* Revert button — small, subtle, manager only */}
        {isManager && prevStageKey && onChangeStage && currentStage !== 'finalizado' && (
          <button
            onClick={revert}
            disabled={changing}
            title={`Voltar para "${STAGE_ORDER[currentIdx - 1]}"`}
            className="flex items-center gap-1.5 text-[10px] text-base-200 hover:text-base-50 transition-colors px-2 py-1 rounded-lg hover:bg-base-700 border border-transparent hover:border-base-500"
          >
            <RotateCcw size={11} />
            Voltar etapa
          </button>
        )}
      </div>

      {/* Gargalo banner */}
      {topGargalo && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold
          ${topGargalo.level === 'critical'
            ? 'border-danger/40 bg-danger/10 text-danger animate-pulse-red'
            : 'border-orange/40 bg-orange/10 text-orange'}`}>
          <AlertTriangle size={14} />
          Parada em "{topGargalo.stage.label}" há {topGargalo.days} {topGargalo.days === 1 ? 'dia' : 'dias'}
          {topGargalo.level === 'critical' ? ' — verifique o que está bloqueando' : ''}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-1">
        {STAGE_ORDER.map((key, idx) => {
          const stage      = timings.find(s => s.key === key) || { key, label: key, start: null, end: null, days: null, active: false };
          const done       = stage.days !== null && !stage.active;
          const active     = stage.active;
          const gargalo    = active ? getGargaloLevel(stage) : null;
          const activeDays = active ? daysInStage(stage) : null;
          const isLast     = idx === STAGE_ORDER.length - 1;
          const advLabel   = ADVANCE_LABELS[key];
          const canAdvance = isManager && active && advLabel && onChangeStage;

          return (
            <div key={key} className="flex gap-3">
              {/* Dot + line */}
              <div className="flex flex-col items-center w-5 flex-shrink-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 relative transition-all
                  ${done    ? 'bg-success border-success'
                  : active && gargalo === 'critical' ? 'bg-danger border-danger animate-pulse'
                  : active && gargalo === 'warning'  ? 'bg-orange border-orange animate-pulse'
                  : active  ? 'bg-brand border-brand'
                  : 'bg-base-800 border-base-500'}`}>
                  {done && <Check size={10} className="text-white" />}
                  {active && gargalo === 'critical' && <AlertTriangle size={9} className="text-white" />}
                  {active && !gargalo && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                {!isLast && (
                  <div className={`flex-1 w-px mt-1 transition-colors ${done ? 'bg-success/50' : 'bg-base-600'}`}
                       style={{ minHeight: canAdvance ? 40 : 20 }} />
                )}
              </div>

              {/* Content card */}
              <div className={`flex-1 pb-3 rounded-xl px-3 py-2.5 mb-1 border transition-all
                ${active && gargalo === 'critical' ? 'border-danger/40 bg-danger/5'
                : active && gargalo === 'warning'  ? 'border-orange/30 bg-orange/5'
                : active  ? 'border-brand/30 bg-brand/5'
                : done    ? 'border-success/20 bg-success/[.03]'
                : 'border-base-600/50 bg-transparent'}`}>

                {/* Stage title + duration */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-xs font-semibold
                    ${active && gargalo ? 'text-danger'
                    : active ? 'text-brand-light'
                    : done   ? 'text-success'
                    : 'text-base-300'}`}>
                    {stage.label}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold tabular-nums
                    ${active && gargalo === 'critical' ? 'text-danger'
                    : active ? 'text-brand-light'
                    : 'text-base-400'}`}>
                    {active && activeDays !== null
                      ? `${activeDays}d em andamento`
                      : done && stage.days !== null
                        ? `${stage.days}d`
                        : '—'}
                  </span>
                </div>

                {/* Dates row */}
                {(active || done) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-base-300">
                    {stage.start && (
                      <span className="flex items-center gap-1">
                        <Clock size={9} className="flex-shrink-0" />
                        Início: {fmtDatetime(stage.start)}
                      </span>
                    )}
                    {done && stage.end && (
                      <span className="flex items-center gap-1 text-success/70">
                        <Check size={9} className="flex-shrink-0" />
                        Concluído: {fmtDatetime(stage.end)}
                      </span>
                    )}
                  </div>
                )}

                {/* Advance button — only on active stage, for managers */}
                {canAdvance && (
                  <button
                    onClick={advance}
                    disabled={changing}
                    className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                      text-xs font-semibold transition-all border
                      ${gargalo === 'critical'
                        ? 'bg-danger/15 hover:bg-danger/25 border-danger/30 text-danger hover:text-white'
                        : 'bg-brand/10 hover:bg-brand/20 border-brand/30 text-brand-light hover:text-white'}
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {changing
                      ? <Spinner size={13} />
                      : <>
                          <Check size={13} />
                          Concluir: {advLabel}
                          <ChevronRight size={13} className="ml-auto opacity-60" />
                        </>
                    }
                  </button>
                )}

                {/* "Finalizado" — show delivery date if available */}
                {key === 'finalizado' && active && task.deliveryForecast && (
                  <div className="mt-2 text-[10px] text-base-200 flex items-center gap-1">
                    <Clock size={9} /> Previsão de entrega: {fmtDatetime(task.deliveryForecast)}
                  </div>
                )}
                {key === 'finalizado' && done && task.deliveryDate && (
                  <div className="mt-2 text-[10px] text-success/80 flex items-center gap-1">
                    <Check size={9} /> Entregue em: {fmtDatetime(task.deliveryDate)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-base-500/50 text-[11px] text-base-200">
        <span>Tempo total parado: <strong className="text-base-100">{summary.totalStoppedDays ?? 0}d</strong></span>
        <span>Duração da OS: <strong className="text-base-100">{totalOsDays}d</strong></span>
        {task.delayReason && (
          <span className="w-full text-warning">Motivo do atraso: {task.delayReason}</span>
        )}
      </div>
    </div>
  );
}
