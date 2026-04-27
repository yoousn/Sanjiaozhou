import React from "react";

export function CommunityActivityBar({
  activities,
}: {
  activities: Array<{ id: string; postId: string; uploader: string; action: string; time: string }>;
}) {
  function shortTime(iso: string) {
    try {
      const d = new Date(iso);
      const now = Date.now();
      const diff = now - d.getTime();
      if (diff < 60_000) return "刚刚";
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
      if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
      return `${Math.floor(diff / 86_400_000)}d`;
    } catch {
      return "";
    }
  }

  return (
    <aside className="hidden xl:block w-52 shrink-0">
      <div className="sticky top-8">
        <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-3">
            社区动态
          </h4>
          <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-[11px] text-zinc-400 font-medium">暂无动态</p>
            ) : (
              activities.slice(0, 15).map((act) => (
                <div key={act.id} className="flex items-start gap-2 text-[11px]">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 shrink-0">
                    {act.uploader}
                  </span>
                  <span className="text-zinc-400 leading-relaxed">{act.action}</span>
                  <span className="text-zinc-300 dark:text-zinc-600 shrink-0 ml-auto text-[10px]">
                    {shortTime(act.time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
