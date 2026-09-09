import { useId, useState, type ReactNode } from 'react';

/** Small, unopinionated building blocks shared by every screen. */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,41,0.04),0_8px_24px_-16px_rgba(15,23,41,0.25)]',
        padded && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({
  children,
  hint,
  right,
}: {
  children: ReactNode;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{children}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad' | 'debt';

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-ink',
  brand: 'text-brand',
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad',
  debt: 'text-debt',
};

const TONE_CHIP: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2 border-line',
  brand: 'bg-brand-soft text-brand border-transparent',
  good: 'bg-good-soft text-good border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  bad: 'bg-bad-soft text-bad border-transparent',
  debt: 'bg-brand-soft text-debt border-transparent',
};

/** A headline number with a label. The core unit of the dashboard. */
export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
  hint,
  size = 'md',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  hint?: string;
  size?: 'md' | 'lg';
}) {
  return (
    <div
      className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
      title={hint}
    >
      <div className="text-[13px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cx(
          'num mt-1.5 font-semibold tracking-tight tabular-nums',
          size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-[28px]',
          TONE_TEXT[tone],
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-sm text-muted">{sub}</div>}
    </div>
  );
}

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONE_CHIP[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  title,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-brand text-white border-transparent hover:opacity-90',
    secondary: 'bg-surface text-ink border-line hover:bg-surface-2',
    ghost: 'bg-transparent text-ink-2 border-transparent hover:bg-surface-2',
    danger: 'bg-bad-soft text-bad border-transparent hover:opacity-80',
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl border font-medium transition disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-3.5 py-2 text-[15px]',
        variants[variant],
      )}
    >
      {children}
    </button>
  );
}

/** Segmented control — used for Plan/Actual and other two-to-four-way switches. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cx(
            'rounded-lg font-medium transition',
            size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-[15px]',
            value === option.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-muted hover:text-ink-2',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[15px] font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition',
          checked ? 'border-transparent bg-brand' : 'border-line bg-surface-2',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
          style={{ height: 18, width: 18 }}
        />
      </button>
    </div>
  );
}

/**
 * A labelled numeric input.
 *
 * Keeps its own draft string while focused so typing "1", "12", "12." does not get
 * fought by re-formatting on every keystroke; commits the parsed number on change.
 */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  prefix,
  step = 1,
  min,
  max,
  hint,
  decimals,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  prefix?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  decimals?: number;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const display =
    draft ?? (decimals !== undefined ? value.toFixed(decimals) : String(Number(value.toFixed(6))));

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === '' || Number.isNaN(parsed)) {
      setDraft(null);
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(next);
    setDraft(null);
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
      </label>
      <div
        className={cx(
          'mt-1.5 flex items-center rounded-xl border border-line bg-surface-2 px-3 transition focus-within:border-brand',
          disabled && 'opacity-50',
        )}
      >
        {prefix && <span className="mr-1 shrink-0 text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          disabled={disabled}
          value={display}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
          }}
          className="num w-full bg-transparent py-2.5 text-[16px] font-medium tabular-nums outline-none"
        />
        {suffix && <span className="ml-1 shrink-0 text-sm text-muted">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

/** Percentage input that shows whole percents but stores a fraction. */
export function PercentField({
  label,
  value,
  onChange,
  hint,
  decimals = 2,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  decimals?: number;
  min?: number;
  max?: number;
}) {
  return (
    <NumberField
      label={label}
      value={value * 100}
      onChange={(next) => onChange(next / 100)}
      suffix="%"
      step={0.25}
      decimals={decimals}
      min={min === undefined ? undefined : min * 100}
      max={max === undefined ? undefined : max * 100}
      hint={hint}
    />
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[16px] outline-none transition focus:border-brand"
      />
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

/** Collapsible group used to organise the Inputs screen. */
export function Accordion({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface-2"
      >
        <div className="min-w-0">
          <div className="text-[17px] font-semibold text-ink">{title}</div>
          {summary && <div className="mt-0.5 truncate text-sm text-muted">{summary}</div>}
        </div>
        <span
          className={cx(
            'shrink-0 text-muted transition-transform',
            open && 'rotate-90',
          )}
          aria-hidden
        >
          ▶
        </span>
      </button>
      {open && <div className="border-t border-line px-5 py-5">{children}</div>}
    </div>
  );
}

/** Prominent warning banner — used for the liquidity failure case. */
export function Callout({
  tone = 'warn',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const tones: Record<Tone, string> = {
    neutral: 'border-line bg-surface-2 text-ink-2',
    brand: 'border-brand/30 bg-brand-soft text-ink',
    good: 'border-good/30 bg-good-soft text-ink',
    warn: 'border-warn/40 bg-warn-soft text-ink',
    bad: 'border-bad/40 bg-bad-soft text-ink',
    debt: 'border-debt/30 bg-brand-soft text-ink',
  };
  return (
    <div className={cx('rounded-2xl border px-4 py-3.5 sm:px-5', tones[tone])}>
      {title && <div className="text-[15px] font-semibold">{title}</div>}
      <div className={cx('text-sm leading-relaxed', title && 'mt-1')}>{children}</div>
    </div>
  );
}

/** Label / value row used inside detail panels. */
export function DataRow({
  label,
  value,
  tone = 'neutral',
  emphasis,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: Tone;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex items-baseline justify-between gap-4 py-2',
        emphasis && 'border-t border-line pt-2.5 font-semibold',
      )}
    >
      <span className={cx('text-sm', emphasis ? 'text-ink' : 'text-muted')}>{label}</span>
      <span className={cx('num text-right tabular-nums', emphasis ? 'text-[17px]' : 'text-[15px]', TONE_TEXT[tone])}>
        {value}
      </span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-muted">
      {children}
    </div>
  );
}
