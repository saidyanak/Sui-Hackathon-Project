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
    // 1) endDate değeri kesinlikle sayıya dönüştürülüyor
    const rawEnd = Number(task.endDate);

    // Eğer null, undefined veya geçersizse → süresi doldu
    if (!rawEnd || isNaN(rawEnd)) {
      setTimeText("Süresi doldu");
      setIsExpired(true);
      return;
    }

    // 2) Saniye mi? Milisaniye mi?
    // 2 milyardan küçükse → saniyedir → ms'ye çevir
    const endDateMs = rawEnd < 2000000000 ? rawEnd * 1000 : rawEnd;

    // 3) Şu anki zaman farkı
    const remaining = endDateMs - Date.now();

    // Süre dolduysa
    if (remaining <= 0) {
      setTimeText("Süresi doldu");
      setIsExpired(true);
      return;
    }

    // 4) Kalan süre hesaplama
    const totalSeconds = Math.floor(remaining / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // 5) Format: 1g 3s 12d 55sn
    setTimeText(`${days}g ${hours}s ${minutes}d ${seconds}sn`);
    setIsExpired(false);
  };

  // ⏳ Her saniye CANLI olarak tekrar hesaplanır
  useEffect(() => {
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  // Oylama yüzdeleri
  const totalVotes = (task.yesVotes || 0) + (task.noVotes || 0);
  const yesPercent =
    totalVotes > 0 ? Math.round((task.yesVotes / totalVotes) * 100) : 0;
  const noPercent =
    totalVotes > 0 ? Math.round((task.noVotes / totalVotes) * 100) : 0;

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 cursor-pointer 
                 hover:border-[#2AA5FE] hover:shadow-[0_0_20px_rgba(42,165,254,0.4)] transition"
    >
      {/* Badgeler */}
      <div className="flex gap-2 mb-3">
        <span className="px-3 py-1 bg-blue-500 text-xs rounded-full">
          {task.taskType === 1 ? "Proje" : "Katılım"}
        </span>
        <span className="px-3 py-1 bg-green-600 text-xs rounded-full">
          {getTaskStatusName(task.status)}
        </span>
      </div>

      {/* Başlık */}
      <h3 className="text-xl font-bold text-white mb-1">{task.title}</h3>

      {/* Açıklama */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-3">
        {task.description}
      </p>

      {/* Süre */}
      <p className="text-xs text-[#8BD7FF] mb-4">⏳ {timeText}</p>

      {/* OYLAMA — Süre dolmamış ve status = 0 ise */}
      {task.status === 0 && !isExpired && (
        <div className="mb-4">
          <p className="text-xs text-yellow-300 mb-1">🗳️ Oylama Devam Ediyor</p>

          <div className="text-xs flex justify-between mb-1">
            <span>👍 Evet: {yesPercent}%</span>
            <span>👎 Hayır: {noPercent}%</span>
          </div>

          {/* EVET Progress */}
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-green-400"
              style={{ width: `${yesPercent}%` }}
            />
          </div>

          {/* HAYIR Progress */}
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400"
              style={{ width: `${noPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Alt Bilgi */}
      <div className="flex justify-between text-xs text-gray-400 mt-4 border-t border-white/10 pt-4">
        <span>💬 {task.commentsCount}</span>
        <span>👥 {task.participantsCount}</span>
        <span>💰 {task.donationsCount}</span>
      </div>
    </div>
  );
}
