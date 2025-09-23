interface Activity {
  id: string
  type: string
  description: string
  user: string
  timestamp: Date
}

interface ActivityFeedProps {
  activities: Activity[]
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No recent activities
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs text-primary-600">
                {activity.user.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-800">
              <span className="font-medium">{activity.user}</span> {activity.description}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}