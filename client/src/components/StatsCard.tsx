interface StatsCardProps {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
  trend?: string
  onClick?: () => void
  className?: string
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend, 
  onClick,
  className = ''
}: StatsCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-6 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {trend} from last month
            </p>
          )}
        </div>
        <div className={`${color} p-3 rounded-full bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  )
}