import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface TaskCardProps {
  task: any;
  getTaskStatusName: (status: number) => string;
}

export default function TaskCard({ task, getTaskStatusName }: TaskCardProps) {
  const navigate = useNavigate();

  const [timeText, setTimeText] = useState("Hesaplanıyor...");
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeLeft = () => {
    // voting_end_date veya endDate kullan
    const rawEnd = Number(task.votingEndDate || task.endDate);

    // Eğer null, undefined veya geçersizse → süresi doldu
    if (!rawEnd || isNaN(rawEnd) || rawEnd === 0) {
      setTimeText("Süre belirtilmedi");
      setIsExpired(true);
      return;
    }

    // Sui'de epoch_timestamp_ms kullanılıyor, yani milisaniye cinsinden
    // Eğer değer çok küçükse (saniye cinsinden olabilir), ms'ye çevir
    const endDateMs = rawEnd < 2000000000000 ? rawEnd : rawEnd;

    // Şu anki zaman farkı
    const remaining = endDateMs - Date.now();

    // Süre dolduysa
    if (remaining <= 0) {
      setTimeText("Süresi doldu");
      setIsExpired(true);
      return;
    }

    // Kalan süre hesaplama
    const totalSeconds = Math.floor(remaining / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Format
    if (days > 0) {
      setTimeText(`${days}g ${hours}s ${minutes}d`);
    } else if (hours > 0) {
      setTimeText(`${hours}s ${minutes}d ${seconds}sn`);
    } else {
      setTimeText(`${minutes}d ${seconds}sn`);
    }
    setIsExpired(false);
  };

  // Her saniye güncelle
  useEffect(() => {
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [task.votingEndDate, task.endDate]);

  // Oylama yüzdeleri - Number ile kesin dönüşüm
  const yesVotes = Number(task.yesVotes) || 0;
  const noVotes = Number(task.noVotes) || 0;
  const totalVotes = yesVotes + noVotes;
  const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
  const noPercent = totalVotes > 0 ? Math.round((noVotes / totalVotes) * 100) : 0;

  // Creator gösterimi - username varsa onu göster, yoksa kısaltılmış adres
  const creatorDisplay = task.creatorUsername || 
    (task.creator ? `${task.creator.slice(0, 6)}...${task.creator.slice(-4)}` : 'Bilinmiyor');

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 cursor-pointer 
                 hover:border-[#2AA5FE] hover:shadow-[0_0_20px_rgba(42,165,254,0.4)] transition"
    >
      {/* Badgeler */}
      <div className="flex gap-2 mb-3">
        <span className={`px-3 py-1 text-xs rounded-full ${task.taskType === 1 ? 'bg-orange-500' : 'bg-blue-500'}`}>
          {task.taskType === 1 ? "💰 Proje" : "🎮 Katılım"}
        </span>
        <span className={`px-3 py-1 text-xs rounded-full ${
          task.status === 0 ? 'bg-yellow-500' :
          task.status === 1 ? 'bg-green-600' :
          task.status === 2 ? 'bg-red-500' :
          'bg-gray-500'
        }`}>
          {getTaskStatusName(task.status)}
        </span>
      </div>

      {/* Başlık */}
      <h3 className="text-xl font-bold text-white mb-1">{task.title}</h3>

      {/* Creator Info */}
      <div className="flex items-center gap-2 mb-3">
        {task.creatorAvatar && (
          <img 
            src={task.creatorAvatar} 
            alt="" 
            className="w-5 h-5 rounded-full"
          />
        )}
        <span className="text-gray-400 text-xs">Oluşturan:</span>
        <span className="text-[#2AA5FE] text-xs font-medium">
          {creatorDisplay}
        </span>
      </div>

      {/* Açıklama */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
        {task.description}
      </p>

      {/* Süre */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs ${isExpired ? 'text-red-400' : 'text-[#8BD7FF]'}`}>
          ⏳ {timeText}
        </span>
      </div>

      {/* OYLAMA — status = 0 (VOTING) ise */}
      {task.status === 0 && (
        <div className="mb-4 bg-white/5 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-yellow-300">🗳️ Oylama</span>
            <span className="text-xs text-gray-400">{totalVotes} oy</span>
          </div>

          {/* Combined Progress Bar */}
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
            {yesPercent > 0 && (
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                style={{ width: `${yesPercent}%` }}
              />
            )}
            {noPercent > 0 && (
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-300"
                style={{ width: `${noPercent}%` }}
              />
            )}
          </div>

          {/* Oy Sayıları */}
          <div className="flex justify-between text-xs mt-2">
            <span className="text-green-400">👍 Evet: {yesVotes} ({yesPercent}%)</span>
            <span className="text-red-400">👎 Hayır: {noVotes} ({noPercent}%)</span>
          </div>
        </div>
      )}

      {/* Alt Bilgi */}
      <div className="flex justify-between text-xs text-gray-400 mt-4 border-t border-white/10 pt-4">
        <span>💬 {task.commentsCount || 0}</span>
        <span>👥 {task.participantsCount || 0}</span>
        {task.taskType === 1 && task.budgetAmount > 0 && (
          <span>💰 {(task.budgetAmount / 1_000_000_000).toFixed(2)} SUI</span>
        )}
      </div>
    </div>
  );
}
