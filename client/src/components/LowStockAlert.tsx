interface LowStockItem {
  id: string
  name: string
  quantity: number
  minQuantity: number
}

interface LowStockAlertProps {
  items: LowStockItem[]
}

export default function LowStockAlert({ items }: LowStockAlertProps) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        All items are well stocked
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="border-l-4 border-orange-500 pl-3 py-2">
          <p className="text-sm font-medium text-gray-800">{item.name}</p>
          <p className="text-xs text-gray-500">
            Current: {item.quantity} / Min: {item.minQuantity}
          </p>
        </div>
      ))}
    </div>
  )
}