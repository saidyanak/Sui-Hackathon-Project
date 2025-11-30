import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { WalletConnect } from "../components/WalletConnect";
import { taskService } from "../services/taskService";
import { useQuery } from "@tanstack/react-query";
import TaskCard from "../components/TaskCard";
import { useDisconnectWallet, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "react-hot-toast";
import api from "../services/api";

interface UserStats {
  tasksCreated: number;
  tasksParticipated: number;
  votesCount: number;
  donationsCount: number;
  totalDonated: string;
  reputationScore: number;
}

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
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [filter, setFilter] = useState<string>("all");
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [isDonating, setIsDonating] = useState(false);

  const SPONSOR_ADDRESS =
    "0xc41d4455273841e9cb81ae9f6034c0966a61bb540892a5fd8caa9614e2c44115";

  // Fetch tasks with profile info enrichment
  const {
    data: tasks = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      try {
        const response = await taskService.getTasks();

        const allAddresses: string[] = [];
        response.forEach((task: any) => {
          if (task.creator) allAddresses.push(task.creator);
          if (task.donations) {
            task.donations.forEach((d: any) => {
              if (d.donor) allAddresses.push(d.donor);
            });
          }
        });

        const uniqueAddresses = [...new Set(allAddresses)];

        let profilesMap: {
          [address: string]: { username?: string; avatar?: string };
        } = {};

        if (uniqueAddresses.length > 0) {
          const { userService } = await import("../services/userService");
          const profiles = await userService.getProfilesByWalletAddresses(
            uniqueAddresses
          );

          profiles.forEach((p: any) => {
            profilesMap[p.realWalletAddress] = {
              username: p.username,
              avatar: p.avatar,
            };
          });
        }

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

  // Donate to community treasury
  const handleCommunityDonate = async () => {
    const amount = parseFloat(donationAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!currentAccount?.address) {
      toast.error("You must connect a wallet to donate");
      return;
    }

    const amountInMist = Math.floor(amount * 1_000_000_000);

    setIsDonating(true);

    try {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
      tx.transferObjects([coin], tx.pure.address(SPONSOR_ADDRESS));

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async () => {
            toast.success(`🎉 ${amount} SUI donated to the community!`);
            setDonationAmount("");
            setShowDonateModal(false);
            setIsDonating(false);

            try {
              await api.post("/api/profile/add-donation", {
                amount: amountInMist,
              });
            } catch (e) {
              console.log("Stats update error:", e);
            }
          },
          onError: (error: any) => {
            console.error("Donation error:", error);
            toast.error("Donation failed: " + error.message);
            setIsDonating(false);
          },
        }
      );
    } catch (error: any) {
      console.error("Donation error:", error);
      toast.error("An error occurred during donation");
      setIsDonating(false);
    }
  };

  const handleLogout = () => {
    try {
      disconnectWallet();
    } catch (e) {
      console.log("Wallet disconnect error:", e);
    }

    logout();
    navigate("/login");
  };

  const getTaskStatusName = (status: number) => {
    switch (status) {
      case 0:
        return "Voting";
      case 1:
        return "Active";
      case 2:
        return "Rejected";
      case 3:
        return "Completed";
      case 4:
        return "Cancelled";
      default:
        return "Unknown";
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
          <h2 className="text-2xl font-bold text-red-500 mb-4">An Error Occurred</h2>
          <p className="text-gray-400">There was an issue loading the tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white">

      {/* 💝 DONATION MODAL */}
      {showDonateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-800 border border-purple-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">💝</div>
              <h2 className="text-xl font-bold text-white mb-2">Donate to the Community</h2>
              <p className="text-gray-400 text-sm">
                Your donation goes to the community treasury and is used to support future projects.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Donation Amount (SUI)</label>
              <input
                type="number"
                step="0.1"
                min="0.01"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                placeholder="0.5"
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            {!currentAccount?.address && (
              <p className="text-yellow-400 text-xs text-center mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                ⚠️ You must connect an external wallet to donate (Connect Wallet)
              </p>
            )}

            <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg mb-4">
              <p className="text-purple-300 text-xs">
                <strong>Community Treasury:</strong><br />
                <span className="font-mono text-[10px]">
                  {SPONSOR_ADDRESS.slice(0, 20)}...{SPONSOR_ADDRESS.slice(-8)}
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDonateModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCommunityDonate}
                disabled={isDonating || !currentAccount?.address || !donationAmount}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDonating ? "Sending..." : "💝 Donate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED TOP HEADER */}
      <header
        className="
          fixed top-0 left-[300px] right-0 h-20 z-50
          bg-white/5 backdrop-blur-xl
          flex items-center justify-end px-10 gap-4
        "
      >
        <WalletConnect />

        <button
          onClick={() => navigate("/tasks/create")}
          className="bg-[#2AA5FE] text-black font-bold px-5 py-2 rounded-xl shadow-lg hover:bg-[#53bfff] transition"
        >
          + Create Ticket
        </button>
      </header>

      {/* 🌊 FIXED SIDEBAR */}
      <aside
        className="
        w-[300px] fixed top-0 left-0 h-screen
        bg-white/5 backdrop-blur-xl
        p-6 flex flex-col shadow-xl z-40
      "
      >
        {/* LOGO */}
        <h1
          className="text-xl font-bold text-[#8BD7FF] mb-8 cursor-pointer"
          onClick={() => navigate("/")}
        >
          42 Community Platform
        </h1>

        {/* USER PROFILE */}
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

            {localStorage.getItem("userProfileId") && (
              <p className="text-gray-500 text-[10px] font-mono mt-1">
                ID: {localStorage.getItem("userProfileId")?.slice(0, 6)}...
              </p>
            )}
          </div>
        </div>

        {/* 🔥 STATS */}
        {stats && (
          <div className="mt-4 bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-xs text-gray-300">
              <span>📝 Created</span>
              <span className="font-semibold">{stats.tasksCreated}</span>
            </div>

            <div className="flex justify-between text-xs text-gray-300">
              <span>🙋 Participation</span>
              <span className="font-semibold">{stats.tasksParticipated}</span>
            </div>

            <div className="flex justify-between text-xs text-gray-300">
              <span>💰 Donations</span>
              <span className="font-semibold">{stats.donationsCount}</span>
            </div>

            <div className="flex justify-between text-xs text-gray-300">
              <span>💎 Total Donated</span>
              <span className="font-semibold">
                {(Number(stats.totalDonated) / 1_000_000_000).toFixed(2)} SUI
              </span>
            </div>

            <div className="flex justify-between text-xs text-gray-300">
              <span>🗳️ Votes</span>
              <span className="font-semibold">{stats.votesCount}</span>
            </div>
          </div>
        )}

        {/* DONATE BUTTON */}
        <button
          onClick={() => setShowDonateModal(true)}
          className="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg flex items-center justify-center gap-2"
        >
          💝 Donate to Community
        </button>

        {/* LEADERBOARD */}
        <button
          onClick={() => navigate("/leaderboard")}
          className="mt-3 w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:from-yellow-600 hover:to-orange-600 transition shadow-lg flex items-center justify-center gap-2"
        >
          🏆 Leaderboard
        </button>

        {/* LOGOUT */}
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full py-2 text-center text-red-400 border border-red-400/40 rounded-lg hover:bg-red-500/20 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* 🌟 MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-y-auto ml-[300px] pt-24">
        {/* FILTERS */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={`px-5 py-2 rounded-lg ${
              filter === "all"
                ? "bg-[#2AA5FE] text-black font-bold"
                : "bg-white/10 text-gray-300"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter("participation")}
            className={`px-5 py-2 rounded-lg ${
              filter === "participation"
                ? "bg-blue-500 text-black font-bold"
                : "bg-white/10 text-gray-300"
            }`}
          >
            Participation
          </button>

          <button
            onClick={() => setFilter("proposal")}
            className={`px-5 py-2 rounded-lg ${
              filter === "proposal"
                ? "bg-orange-500 text-black font-bold"
                : "bg-white/10 text-gray-300"
            }`}
          >
            Proposal
          </button>
        </div>

        {/* TASK GRID */}
        {loading ? (
          <div className="text-center mt-20">
            <div className="animate-spin h-12 w-12 border-4 border-[#2AA5FE] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-[#8BD7FF] mt-4">Fetching data from Sui Network...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
            <p className="text-gray-400">No proposals found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTasks.map((task: any) => (
              <TaskCard key={task.id} task={task} getTaskStatusName={getTaskStatusName} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
