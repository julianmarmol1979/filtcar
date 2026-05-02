export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 text-sm">Bienvenido al sistema de gestión Lubricentro FILT-CAR.</p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Artículos", value: "—", color: "bg-blue-50 text-blue-700" },
          { label: "Clientes", value: "—", color: "bg-green-50 text-green-700" },
          { label: "Ventas hoy", value: "—", color: "bg-yellow-50 text-yellow-700" },
          { label: "Caja", value: "—", color: "bg-purple-50 text-purple-700" },
          { label: "Deudas pendientes", value: "—", color: "bg-red-50 text-red-700" },
          { label: "Presupuestos", value: "—", color: "bg-gray-50 text-gray-700" },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
