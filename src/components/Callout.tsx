import { TriangleAlert } from 'lucide-react';

interface CalloutProps {
  /** warn = amber; contra = escalated red (stronger than warn). */
  tone: 'warn' | 'contra';
  title: string;
  items: string[];
}

// Static rgba borders (NOT color-mix) so the warning/contraindication affordance
// never silently drops on a browser without color-mix support — these are safety
// cues, not decoration. Values are --warn #FFB020 @30% and --red #FF4D4D @50%.
const TONES = {
  warn: { color: 'var(--warn)', bg: 'var(--warn-tint)', border: 'rgba(255, 176, 32, 0.30)' },
  contra: { color: 'var(--red)', bg: 'var(--red-tint-2)', border: 'rgba(255, 77, 77, 0.50)' },
} as const;

/**
 * Clear Signal warning / contraindication callout. Contraindications are
 * escalated (stronger red, thicker border) above warnings — never weaken that
 * hierarchy. role="alert" so assistive tech announces the safety content.
 */
export function Callout({ tone, title, items }: CalloutProps) {
  const t = TONES[tone];
  return (
    <div role="alert" className="rounded-2xl p-4" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <p className="cs-eyebrow mb-2 flex items-center gap-1.5" style={{ color: t.color }}>
        <TriangleAlert className="w-3.5 h-3.5" /> {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-2)' }}>
            <span className="mt-1" style={{ color: t.color }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
