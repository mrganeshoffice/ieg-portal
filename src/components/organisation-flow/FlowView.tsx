import { ArrowDown } from 'lucide-react';
import { flowSectionMeta, flowSectionOrder, type FlowItem, type FlowSection } from '@/data/organisationFlow';
import ImageCard from './ImageCard';

/**
 * Default view: items grouped by their place in the flow (Group → Companies → Departments),
 * fanning out like a tree rather than a strict left-to-right sequence, since companies and
 * departments are siblings at their level rather than steps that happen one after another.
 */
export default function FlowView({ itemsBySection, onOpen }: { itemsBySection: Record<FlowSection, FlowItem[]>; onOpen: (id: string) => void }) {
  const visibleSections = flowSectionOrder.filter((s) => itemsBySection[s].length > 0);

  return (
    <div className="space-y-3">
      {visibleSections.map((section, i) => {
        const meta = flowSectionMeta[section];
        const items = itemsBySection[section];
        return (
          <div key={section}>
            {i > 0 && (
              <div className="no-print flex justify-center py-1" aria-hidden="true">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-brand shadow-soft"><ArrowDown size={16} /></span>
              </div>
            )}
            <section className="card p-5 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-gradient-to-br from-brand/15 to-leaf/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-600">{meta.label}</span>
                <span className="text-xs text-muted">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
              </div>
              <p className="mb-4 max-w-2xl text-sm text-muted">{meta.blurb}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => <ImageCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />)}
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}
