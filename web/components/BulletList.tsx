export function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3">
          <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
          <p className="text-sm text-muted leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  );
}
