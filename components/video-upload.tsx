'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { supabaseClient } from '@/lib/supabase-admin';

export default function VideoUpload() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: any) => {
    if (!user) return;
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);

    try {
      // Fetch session token securely
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('جلسة العمل غير صالحة، برجاء تسجيل الدخول مجددًا');
        return;
      }

      // ① طلب Signed URL من الـ API — لا يمر الفيديو على Vercel هنا
      const signRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploaderEmail: user.email,
        }),
      });

      const signData = await signRes.json();

      if (!signRes.ok || signData.error) {
        alert(signData.error || 'حدث خطأ أثناء التحضير');
        return;
      }

      const { signedUrl, publicUrl, storagePath } = signData;

      // ② رفع الفيديو مباشرة من المتصفح إلى R2 Storage (بدون Vercel)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setProgress(pct);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        // في R2/S3 Pre-signed URLs، نستخدم PUT
        xhr.open('PUT', signedUrl);
        // ملاحظة: تأكد من أن الـ Content-Type يطابق ما تم استخدامه عند إنشاء الـ Signed URL إذا كان مطلوباً
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // ③ إخبار الـ API بحفظ الـ URL في قاعدة البيانات
      const saveRes = await fetch('/api/videos/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicUrl, storagePath }),
      });


      const saveData = await saveRes.json();

      if (!saveRes.ok || saveData.error) {
        alert(saveData.error || 'حدث خطأ أثناء الحفظ');
      } else {
        alert('تم رفع الفيديو بنجاح! شكراً لك ✅');
        window.location.reload();
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ غير متوقع: ' + err.message);
    } finally {
      setLoading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (!user) {
      setShowLockPrompt(true);
      return;
    }
    fileInputRef.current?.click();
  };

  if (authLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && showLockPrompt) {
    return (
      <div className="flex flex-col items-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 max-w-md mx-auto">
        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg mb-2 text-slate-800">تسجيل الدخول مطلوب</h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
          يجب تسجيل الدخول باستخدام Google أولاً لتتمكن من مشاركة تقييمات الفيديو الخاصة بك.
        </p>
        <Button
          onClick={() => signInWithGoogle(window.location.href)}
          className="gap-2 cursor-pointer font-bold px-6 py-5 rounded-full bg-white text-black hover:bg-slate-50 shadow-md border border-slate-200 flex items-center transition-all duration-200 active:scale-98"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31l3.57 2.77c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
          </svg>
          <span className="text-slate-800">تسجيل الدخول باستخدام Google</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="file"
        accept="video/*"
        onChange={handleUpload}
        className="hidden"
        ref={fileInputRef}
      />

      <Button
        onClick={handleButtonClick}
        disabled={loading}
        size="lg"
        className="gap-2 w-full sm:w-auto font-bold text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            {progress > 0 ? `جاري الرفع... ${progress}%` : 'جاري التحضير...'}
          </>
        ) : (
          <>
            <Video className="w-6 h-6" />
            اختر فيديو للتقييم من جهازك
          </>
        )}
      </Button>

      {loading && progress > 0 && (
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-2">
        مسموح برفع الفيديوهات فقط.(الحد الاقصى للفيديو 5 دقائق) 
      </p>
    </div>
  );
}