import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { taskService } from '../services/taskService';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'DONATION' | 'PARTICIPATION' | 'HYBRID';
  status: string;
  targetAmount?: number;
  currentAmount: number;
  createdAt: string;
  creator: {
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  coalition?: {
    name: string;
    color: string;
  };
  _count: {
    participants: number;
    comments: number;
    donations: number;
  };
}

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filter !== 'all') {
        filters.type = filter.toUpperCase();
      }
      const response = await taskService.getTasks(filters);
      setTasks(response.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'DONATION':
        return 'bg-green-500';
      case 'PARTICIPATION':
        return 'bg-blue-500';
      case 'HYBRID':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTaskTypeName = (type: string) => {
    switch (type) {
      case 'DONATION':
        return 'Bağış';
      case 'PARTICIPATION':
        return 'Katılım';
      case 'HYBRID':
        return 'Karma';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
       <header className="bg-gray-800 bg-opacity-50 backdrop-blur-lg border-b border-gray-700">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
           <div className="flex justify-between items-center">
             <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
               42 Community Platform
             </h1>
         
             <div className="flex items-center gap-4">
         
               {/* 🟣 TEKLİF OLUŞTUR BUTONU */}
               <button
                 onClick={() => navigate('/tasks/create')}
                 className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md"
               >
                 + Teklif Oluştur
               </button>
         
               {/* Kullanıcı bilgisi */}
               <div className="flex items-center gap-3">
                 {user?.avatar && (
                   <img
                     src={user.avatar}
                     alt={user.username}
                     className="w-10 h-10 rounded-full border-2 border-purple-500"
                   />
                 )}
                 <div className="text-white">
                   <p className="font-semibold">{user?.username || user?.email}</p>
                   <p className="text-xs text-gray-400">{user?.role}</p>
                 </div>
               </div>
               
               <button
                 onClick={handleLogout}
                 className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
               >
                 Çıkış
               </button>
             </div>
           </div>
         </div>
       </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">Açık Teklifler</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter('donation')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'donation'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Bağış
            </button>
            <button
              onClick={() => setFilter('participation')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'participation'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Katılım
            </button>
            <button
              onClick={() => setFilter('hybrid')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'hybrid'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Karma
            </button>
          </div>
        </div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white text-xl">Yükleniyor...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 bg-opacity-50 rounded-2xl">
            <p className="text-gray-400 text-xl">Henüz teklif bulunmuyor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 hover:border-purple-500 transition cursor-pointer transform hover:scale-105"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <span
                    className={`${getTaskTypeColor(
                      task.type
                    )} text-white px-3 py-1 rounded-full text-xs font-bold`}
                  >
                    {getTaskTypeName(task.type)}
                  </span>
                  {task.coalition && (
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: task.coalition.color + '33', color: task.coalition.color }}
                    >
                      {task.coalition.name}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{task.title}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>

                {task.type !== 'PARTICIPATION' && task.targetAmount && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Hedef: {task.targetAmount} SUI</span>
                      <span>{Math.round((task.currentAmount / task.targetAmount) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((task.currentAmount / task.targetAmount) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    {task.creator.avatar && (
                      <img
                        src={task.creator.avatar}
                        alt={task.creator.username}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm text-gray-400">
                      {task.creator.firstName || task.creator.username}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>💬 {task._count.comments}</span>
                    <span>👥 {task._count.participants}</span>
                    {task.type !== 'PARTICIPATION' && <span>💰 {task._count.donations}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
