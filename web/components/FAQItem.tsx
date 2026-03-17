export function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-2xl border border-border bg-white p-5">
      <summary className="cursor-pointer list-none font-semibold text-foreground pr-8 relative">
        {question}
        <span className="absolute right-0 top-0 text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p>
    </details>
  );
}
