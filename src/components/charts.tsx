import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthRow, YearSummary } from '../model';
import { formatCurrency, formatCurrencyCompact, formatNumber } from '../lib/format';

/**
 * Charts.
 *
 * A deliberately small set: cash vs debt over time, cash in vs cash out per year, and
 * members over time. Colours come from the CSS design tokens so both themes work.
 */

const AXIS = { fontSize: 12, fill: 'var(--c-muted)' };
const GRID = 'var(--c-line)';

function useColors() {
  return {
    cash: 'var(--c-brand)',
    debt: 'var(--c-debt)',
    in: 'var(--c-good)',
    out: 'var(--c-bad)',
    members: 'var(--c-brand)',
    target: 'var(--c-warn)',
  };
}

/**
 * Recharts hands `content` its full props object, so this accepts the loose shape it
 * actually passes rather than a hand-tightened one. `format` is deliberately not called
 * `formatter` — that name already means something else on Recharts' Tooltip.
 */
interface TooltipEntry {
  name?: string | number;
  value?: string | number | Array<string | number>;
  color?: string;
  dataKey?: string | number;
  payload?: { tooltip?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  format: (value: number) => string;
}

function ChartTooltip({ active, payload, label, format }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const heading = payload[0]?.payload?.tooltip ?? label;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
      <div className="mb-1 text-[13px] font-semibold text-ink">{heading}</div>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center gap-2 text-[13px]">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
            aria-hidden
          />
          <span className="text-muted">{entry.name}</span>
          <span className="num ml-auto font-medium tabular-nums text-ink">
            {typeof entry.value === 'number' ? format(entry.value) : String(entry.value ?? '')}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Ending bank cash vs debt remaining, across the whole 63-month timeline. */
export function CashVsDebtChart({
  months,
  cashTarget,
  height = 280,
}: {
  months: MonthRow[];
  cashTarget: number;
  height?: number;
}) {
  const colors = useColors();
  const data = months.map((m) => ({
    label: m.operatingMonth === 0 ? (m.timelineMonth === 0 ? 'Fund' : `B${m.timelineMonth}`) : `${m.operatingMonth}`,
    tooltip:
      m.operatingMonth === 0
        ? m.timelineMonth === 0
          ? 'Funding month'
          : `Build month ${m.timelineMonth}`
        : `Operating month ${m.operatingMonth}`,
    cash: Math.round(m.endingCash),
    debt: Math.round(m.debtRemaining),
    target: Math.round(cashTarget),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.cash} stopOpacity={0.35} />
            <stop offset="100%" stopColor={colors.cash} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval="preserveStartEnd"
          minTickGap={22}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => formatCurrencyCompact(value)}
        />
        <Tooltip
          content={(props) => <ChartTooltip {...props} format={formatCurrency} />}
        />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 6 }} iconType="circle" />
        <Area
          type="monotone"
          dataKey="cash"
          name="Ending bank cash"
          stroke={colors.cash}
          fill="url(#cashFill)"
          strokeWidth={2.5}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="debt"
          name="Debt remaining"
          stroke={colors.debt}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="target"
          name="Cash target"
          stroke={colors.target}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Cash in vs total cash out, one pair of bars per operating year. */
export function CashInOutChart({ years, height = 280 }: { years: YearSummary[]; height?: number }) {
  const colors = useColors();
  const data = years.map((y) => ({
    label: `Year ${y.year}`,
    cashIn: Math.round(y.cashIn),
    cashOut: Math.round(y.totalCashOut),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => formatCurrencyCompact(value)}
        />
        <Tooltip
          cursor={{ fill: 'var(--c-surface-2)' }}
          content={(props) => <ChartTooltip {...props} format={formatCurrency} />}
        />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 6 }} iconType="circle" />
        <Bar dataKey="cashIn" name="Cash collected" fill={colors.in} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="cashOut" name="Total cash out" fill={colors.out} radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Members over the operating months, with the capacity ceiling for context. */
export function MembersChart({
  months,
  capacity,
  height = 280,
}: {
  months: MonthRow[];
  capacity: number;
  height?: number;
}) {
  const colors = useColors();
  const data = months
    .filter((m) => m.operatingMonth > 0)
    .map((m) => ({
      label: `${m.operatingMonth}`,
      tooltip: `Operating month ${m.operatingMonth}`,
      members: m.totalMembers,
      moatza: m.moatzaMembers,
      capacity,
    }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval="preserveStartEnd"
          minTickGap={22}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={(props) => <ChartTooltip {...props} format={formatNumber} />} />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 6 }} iconType="circle" />
        <Line
          type="monotone"
          dataKey="members"
          name="Total members"
          stroke={colors.members}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="capacity"
          name="Capacity"
          stroke={colors.target}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Planned vs actual for one measure, used on the Plan vs Actual screen. */
export function PlanVsActualChart({
  data,
  height = 260,
  label,
}: {
  data: Array<{ label: string; planned: number; actual: number | null }>;
  height?: number;
  label: string;
}) {
  const colors = useColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={20} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => formatCurrencyCompact(value)}
        />
        <Tooltip content={(props) => <ChartTooltip {...props} format={formatCurrency} />} />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 6 }} iconType="circle" />
        <Line
          type="monotone"
          dataKey="planned"
          name={`Planned ${label}`}
          stroke={colors.cash}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name={`Actual ${label}`}
          stroke={colors.in}
          strokeWidth={2.5}
          connectNulls
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
