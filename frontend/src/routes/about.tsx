import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutComponent,
});

function AboutComponent() {
  return (
    <div className="space-y-8 py-4">
      {/* Intro section */}
      <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl font-extrabold text-white">
            Giới thiệu về dự án
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Dự án này sử dụng mô hình lập trình React hiện đại kết hợp với <strong>TanStack Router</strong>. Đây là một trình quản lý định tuyến mạnh mẽ mang lại trải nghiệm lập trình tối ưu cho ứng dụng Single Page (SPA).
          </p>
        </div>
      </section>

      {/* Tutorial section */}
      <section className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🛠️</span> Cách thêm Route mới
        </h3>
        
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Với định tuyến dựa trên tệp (File-based Routing), việc tạo các trang mới vô cùng đơn giản:
          </p>
          
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-slate-400 space-y-2">
            <div>
              <span className="text-indigo-400"># Trang "/blog"</span> <br />
              Tạo tệp: <span className="text-white">src/routes/blog.tsx</span>
            </div>
            <hr className="border-slate-800 my-2" />
            <div>
              <span className="text-indigo-400"># Trang "/profile/$userId" (Tham số động)</span> <br />
              Tạo tệp: <span className="text-white">src/routes/profile.$userId.tsx</span>
            </div>
          </div>

          <p className="text-slate-400">
            *Sau khi tạo file, máy chủ phát triển của Vite (plugin TanStack Router) sẽ tự động biên dịch và cập nhật cây định tuyến mà không cần khởi động lại.
          </p>
        </div>
      </section>

      {/* Navigation demo */}
      <div className="flex justify-between items-center bg-slate-900/30 border border-slate-800/50 p-6 rounded-2xl">
        <span className="text-slate-400 text-sm font-medium">Bạn có muốn quay về trang chủ?</span>
        <Link 
          to="/" 
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white font-semibold text-sm transition-all duration-300 shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          &larr; Về Trang chủ
        </Link>
      </div>
    </div>
  );
}
