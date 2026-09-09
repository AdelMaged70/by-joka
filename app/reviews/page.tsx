import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import VideoUpload from '@/components/video-upload';
import VideoList from '@/components/video-list';

export default function ReviewsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-primary mb-4">تقييمات عملائنا 🎥</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            شاركنا تجربتك من خلال فيديو قصير، أو شاهد آراء عملائنا عن by joka
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-16 text-center">
          <h2 className="text-2xl font-bold mb-6">أضف تقييمك الخاص</h2>
          <VideoUpload />
        </div>

        <div>
          <div className="flex items-center justify-between border-b pb-4 mb-8">
            <h2 className="text-2xl font-bold text-slate-800">أحدث التقييمات</h2>
          </div>
          <VideoList />
        </div>
      </main>

      <Footer />
    </div>
  );
}