export function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">{title}</h2>
      <p className="text-muted max-w-2xl mx-auto">{description}</p>
    </div>
  );
}
