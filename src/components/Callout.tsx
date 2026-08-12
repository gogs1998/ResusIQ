import { TriangleAlert } from 'lucide-react';

interface CalloutProps {
  tone: 'warn' | 'contra';
  title: string;
  items: string[];
}

const TONES = {
  warn: { color: 'var(--warn)', bg: 'var(--warn-tint)', border: 'var(--warn-border)' },
  contra: { color: 'var(--red)', bg: 'var(--red-tint-2)', border: 'var(--red-border)' },
} as const;

/**
 * Warning / contraindication callout. Contraindications are escalated
 * (stronger red, thicker border) above warnings. role="alert" so assistive
 * tech announces the safety content.
 */
export function Callout({ tone, title, items }: CalloutProps) {
  const t = TONES[tone];
  return (
    <div
      role="alert"
      className="rounded-2xl p-4"
      style={{ background: t.bg, border: `${tone === 'contra' ? '2px' : '1.5px'} solid ${t.border}` }}
    >
      <p className="cs-eyebrow mb-2 flex items-center gap-1.5" style={{ color: t.color }}>
        <TriangleAlert className="w-3.5 h-3.5" /> {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-1)' }}>
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
