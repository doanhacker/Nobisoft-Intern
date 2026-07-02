import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="space-y-8 py-4">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 md:p-12 shadow-2xl">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wider uppercase">
            🚀 Trạng thái: Đã kết nối thành công
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Chào mừng bạn đến với <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              TanStack Router Setup!
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg leading-relaxed">
            Ứng dụng của bạn đã được tích hợp TanStack Router với tính năng <strong>File-based Routing</strong>, hỗ trợ <strong>Type Safety</strong> tuyệt đối cho mọi liên kết điều hướng và tham số URL.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a 
              href="https://tanstack.com/router/latest" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 hover:-translate-y-0.5 cursor-pointer"
            >
              Tài liệu TanStack Router
            </a>
            <a 
              href="/about"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 hover:text-white font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
            >
              Khám phá trang Giới thiệu &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-slate-900/45 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/30 p-6 rounded-2xl transition-all duration-300 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4">
            🛡️
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Type Safety 100%</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Mọi đường dẫn (path), tham số truy vấn (search parameters) đều được kiểm soát chặt chẽ bởi TypeScript.
          </p>
        </div>

        <div className="bg-slate-900/45 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 p-6 rounded-2xl transition-all duration-300 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg mb-4">
            📁
          </div>
          <h3 className="text-white font-bold text-lg mb-2">File-based Routing</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Chỉ cần tạo file trong thư mục `src/routes`, hệ thống sẽ tự động cấu hình cây định tuyến cho bạn.
          </p>
        </div>

        <div className="bg-slate-900/45 hover:bg-slate-900 border border-slate-800 hover:border-pink-500/30 p-6 rounded-2xl transition-all duration-300 shadow-md">
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold text-lg mb-4">
            ⚡
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Tải Dữ Liệu Tối Ưu</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Hỗ trợ Loader chạy song song và khả năng tiền tải (preloading) thông minh giúp chuyển trang tức thì.
          </p>
        </div>
      </section>
    </div>
  );
}
