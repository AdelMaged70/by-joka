'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { supabaseClient } from '@/lib/supabase-admin';

export default function VideoList() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vidId: string, videoUrl: string) => {
    if (!user || !user.email) return;
    
    const confirmDelete = window.confirm('هل أنت متأكد من أنك تريد حذف هذا الفيديو؟');
    if (!confirmDelete) return;

    setDeletingId(vidId);

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('حدث خطأ في الجلسة، يرجى تسجيل الدخول مجدداً');
        setDeletingId(null);
        return;
      }

      const res = await fetch('/api/videos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          videoUrl,
          email: user.email
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || 'فشل حذف الفيديو');
      } else {
        // Remove locally from state for smooth UI transition
        setVideos((prev) => prev.filter((v) => v.id !== vidId));
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء محاولة الحذف: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const belongsToUser = (videoUrl: string) => {
    if (!user || !user.email) return false;
    const uploaderKey = user.email.replace(/[^a-zA-Z0-9]/g, '_');
    return videoUrl.includes(`-u_${uploaderKey}-`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-white rounded-2xl border border-slate-100 shadow-sm">
        <p className="text-lg">لا توجد تقييمات حتى الآن. كن أول من يشاركنا رأيه!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {videos.map((vid) => {
        const isOwner = belongsToUser(vid.video_url);
        const isCurrentlyDeleting = deletingId === vid.id;

        return (
          <div key={vid.id} className="rounded-2xl overflow-hidden bg-black shadow-sm border border-slate-200 aspect-[9/16] relative flex items-center justify-center group">
            <video 
              controls 
              className="w-full h-full object-contain"
              preload="metadata"
            >
              <source src={vid.video_url} />
            </video>

            {/* Premium Delete button overlay for owner */}
            {isOwner && (
              <button
                onClick={() => handleDelete(vid.id, vid.video_url)}
                disabled={isCurrentlyDeleting}
                className="absolute top-4 right-4 bg-red-600/90 text-white p-2.5 rounded-full shadow-lg opacity-90 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 disabled:bg-slate-700/80 cursor-pointer z-10 hover:bg-red-600"
                title="حذف الفيديو"
              >
                {isCurrentlyDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}