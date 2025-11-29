import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { WalletConnect } from "../components/WalletConnect";
import { taskService } from "../services/taskService";
import { useQuery } from "@tanstack/react-query";
import TaskCard from "../components/TaskCard";
import { useDisconnectWallet } from "@mysten/dapp-kit";
import api from "../services/api";

interface UserStats {
  tasksCreated: number;
  tasksParticipated: number;
  votesCount: number;
  donationsCount: number;
  totalDonated: string;
  reputationScore: number;
}



// The frontend interface for a Task
interface Task {
  id: string;
  title: string;
  description: string;
  taskType: number; 
  status: number; 
  creator: string; 
  targetAmount: number;
  currentAmount: number;
  participantsCount: number;
  donationsCount: number;
  commentsCount: number;
  yesVotes?: number;
  noVotes?: number;
  startDate: number;
  endDate: number;
  createdAt: number;
  donations?: Array<{ donor: string; amount: number }>;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const [filter, setFilter] = useState<string>("all");

  const { data: tasks = [], isLoading: loading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      try {
        const response = await taskService.getTasks();

        // Tüm creator ve donor adreslerini topla
        const allAddresses: string[] = [];
        response.forEach((task: any) => {
          if (task.creator) allAddresses.push(task.creator);
          if (task.donations) {
            task.donations.forEach((d: any) => {
              if (d.donor) allAddresses.push(d.donor);
            });
          }
        });

        // Unique adresler
        const uniqueAddresses = [...new Set(allAddresses)];

        // Profilleri çek
        let profilesMap: { [address: string]: { username?: string; avatar?: string } } = {};
        if (uniqueAddresses.length > 0) {
          const { userService } = await import("../services/userService");
          const profiles = await userService.getProfilesByWalletAddresses(uniqueAddresses);
          profiles.forEach((p: any) => {
            profilesMap[p.suiWalletAddress] = { 
              username: p.username,
              avatar: p.avatar 
            };
          });
        }

        // Task'lara profil bilgilerini ekle
        const tasksWithUsers = response.map((task: any) => {
          const creatorProfile = profilesMap[task.creator];

          if (task.donations) {
            task.donations = task.donations.map((d: any) => ({
              ...d,
              username: profilesMap[d.donor]?.username,
            }));
          }

          return {
            ...task,
            creatorUsername: creatorProfile?.username,
            creatorAvatar: creatorProfile?.avatar,
          };
        });

        return tasksWithUsers;
      } catch (err) {
        console.error("Error fetching tasks:", err);
        throw err;
      }
    },
  });

    const [stats, setStats] = useState<UserStats | null>(null);


    useEffect(() => {
      async function loadStats() {
        try {
          const res = await api.get("/api/profile/stats");
        
          if (res.data.success) {
            setStats(res.data.stats as UserStats);
          }
        } catch (err) {
          console.log("Stats error:", err);
        }
      }
    
      loadStats();
    }, []);




  const handleLogout = () => {
    try {
      disconnectWallet();
    } catch (e) {
      console.log("Wallet disconnect error:", e);
    }

    localStorage.removeItem("userProfileId");

    logout();
    navigate("/login");
  };

  const getTaskStatusName = (status: number) => {
    switch (status) {
      case 0: return "Oylamada";
      case 1: return "Aktif";
      case 2: return "Reddedildi";
      case 3: return "Tamamlandı";
      case 4: return "İptal";
      default: return "Bilinmiyor";
    }
  };

  const filteredTasks = tasks.filter((task: Task) => {
    if (filter === "all") return true;
    if (filter === "participation") return task.taskType === 0;
    if (filter === "proposal") return task.taskType === 1;
    return true;
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            Bir Hata Oluştu
          </h2>
          <p className="text-gray-400">
            Görevler yüklenirken bir sorun oluştu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white">

      {/* SABİT ÜST MENÜ */}
      <header className="
          fixed top-0 left-[300px] right-0 h-20 z-50 
          bg-white/5 backdrop-blur-xl 
          flex items-center justify-end px-10 gap-4">
          
          
        <WalletConnect />
        
        <button
          onClick={() => navigate('/tasks/create')}
          className="bg-[#2AA5FE] text-black font-bold px-5 py-2 rounded-xl shadow-lg hover:bg-[#53bfff] transition"
        >
          + Teklif Oluştur
        </button>
      </header>


      
      {/* 🌊 SABİT SOL SİDEBAR */}
      <aside className="
        w-[300px] fixed top-0 left-0 h-screen 
        bg-white/5 backdrop-blur-xl 
        p-6 flex flex-col shadow-xl z-40
      ">

        {/* LOGO */}
        <h1
          className="text-xl font-bold text-[#8BD7FF] mb-8 cursor-pointer"
          onClick={() => navigate("/")}
        >
          42 Community Platform
        </h1>

        {/* Kullanıcı Profili */}
        <div
          className="flex items-center gap-4 mb-6 cursor-pointer hover:opacity-80 transition bg-white/5 rounded-xl p-3 hover:bg-white/10"
          onClick={() => navigate("/profile")}
        >
          <img
            src={user?.avatar}
            className="w-14 h-14 rounded-full border-2 border-[#2AA5FE]/60 shadow-md"
          />
          <div className="flex-1">
            <p className="font-semibold text-[#8BD7FF]">{user?.username}</p>
            <p className="text-gray-400 text-xs">{user?.email}</p>

            {localStorage.getItem("userProfileId") && (
              <p className="text-gray-500 text-[10px] font-mono mt-1">
                ID: {localStorage.getItem("userProfileId")?.slice(0, 6)}...
              </p>
            )}
          </div>
        </div>

        
        {/* 🔥 STAT BLOK — BURAYA EKLEYECEKSİN */}
        {stats && (
          <div className="mt-4 bg-white/5 rounded-xl p-4 space-y-3">
          
            <div className="flex justify-between text-xs text-gray-300">
              <span>📝 Oluşturulan</span>
              <span className="font-semibold">{stats.tasksCreated}</span>
            </div>
                
            <div className="flex justify-between text-xs text-gray-300">
              <span>🙋 Katılım</span>
              <span className="font-semibold">{stats.tasksParticipated}</span>
            </div>
                
            <div className="flex justify-between text-xs text-gray-300">
              <span>💰 Bağış</span>
              <span className="font-semibold">{stats.donationsCount}</span>
            </div>
                
            <div className="flex justify-between text-xs text-gray-300">
              <span>💎 Toplam Bağış</span>
              <span className="font-semibold">
                {(Number(stats.totalDonated) / 1_000_000_000).toFixed(2)} SUI
              </span>
            </div>
                
            <div className="flex justify-between text-xs text-gray-300">
              <span>🗳️ Oy</span>
              <span className="font-semibold">{stats.votesCount}</span>
            </div>
                
          </div>
        )}

        {/* ÇIKIŞ BUTONU */}
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full py-2 text-center text-red-400 border border-red-400/40 rounded-lg hover:bg-red-500/20 transition"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ===========================
          🌟 ANA İÇERİK
      ============================ */}
      <main className="flex-1 p-10 overflow-y-auto ml-[300px] pt-24">


        {/* ===========================
            🔍 FİLTRELER
        ============================ */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={`px-5 py-2 rounded-lg ${
              filter === "all"
                ? "bg-[#2AA5FE] text-black font-bold"
                : "bg-white/10 text-gray-300"
            }`}
          >
            Tümü
          </button>

          <button
            onClick={() => setFilter("participation")}
            className={`px-5 py-2 rounded-lg ${
              filter === "participation"
                ? "bg-blue-500 text-black font-bold"
                : "bg-white/10 text-gray-300"
            }`}
          >
            Katılım
          </button>

          <button
            onClick={() => setFilter("proposal")}
            className={`px-5 py-2 rounded-lg ${
              filter === "proposal"
                ? "bg-orange-500 text-black font-bold"
                : "bg-white/10 text-gray-300"
            }`}
          >
            Proje
          </button>
        </div>

        {/* ===========================
            🧩 TEKLİFLER
        ============================ */}
        {loading ? (
          <div className="text-center mt-20">
            <div className="animate-spin h-12 w-12 border-4 border-[#2AA5FE] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-[#8BD7FF] mt-4">
              Sui Network'ten veriler çekiliyor...
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
            <p className="text-gray-400">Henüz teklif yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTasks.map((task: any) => (
              <TaskCard
                key={task.id}
                task={task}
                getTaskStatusName={getTaskStatusName}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
