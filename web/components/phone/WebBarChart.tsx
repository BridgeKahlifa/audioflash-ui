export function WebBarChart({ data }: { data: { day: string; cards: number; isToday: boolean }[] }) {
  const max = Math.max(...data.map((d) => d.cards), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 90, gap: 4 }}>
      {data.map((item, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          {item.cards > 0 && (
            <span style={{ fontSize: 9, color: "var(--primary)", fontWeight: 600 }}>{item.cards}</span>
          )}
          <div style={{
            width: "100%",
            height: Math.max(item.cards > 0 ? (item.cards / max) * 56 : 3, 3),
            background: item.cards > 0 ? "var(--primary)" : "var(--secondary)",
            borderRadius: 4,
            opacity: item.isToday ? 1 : 0.65,
          }} />
          <span style={{ fontSize: 9, color: item.isToday ? "var(--primary)" : "var(--muted-foreground)", fontWeight: item.isToday ? 700 : 400 }}>
            {item.day}
          </span>
        </div>
      ))}
    </div>
  );
}
