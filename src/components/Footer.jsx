import { Icons } from "./Icons";

function SocialBtn({ href, title, children, onClick }) {
  const cls = "w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.10] card-stroke transition text-white/55 hover:text-white";
  if (onClick) {
    return (
      <button onClick={onClick} title={title} className={cls}>
        {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" title={title} className={cls}>
      {children}
    </a>
  );
}

export default function Footer({ onDocs }) {
  return (
    <footer className="relative z-10 w-full border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-7 flex flex-col sm:flex-row items-center justify-between gap-5">

        <div className="text-center sm:text-left">
          <div className="text-[13px] font-semibold tracking-tight">MiraRoute</div>
          <div className="text-[11px] mono text-white/35 mt-0.5">© 2026 · Built on Arc Testnet · Powered by Circle</div>
        </div>

        <div className="flex items-center gap-2">
          <SocialBtn href="https://x.com/Datweb3guy" title="Founder — @Datweb3guy">
            <Icons.Twitter size={14}/>
          </SocialBtn>
          <SocialBtn href="https://x.com/miraroute" title="MiraRoute on X">
            <Icons.Twitter size={14}/>
          </SocialBtn>
          <SocialBtn href="https://github.com/Datwebguy/miraroute" title="GitHub">
            <Icons.Github size={14}/>
          </SocialBtn>
          <SocialBtn href="#" title="Telegram">
            <Icons.Telegram size={14}/>
          </SocialBtn>
          <SocialBtn onClick={onDocs} title="Docs">
            <Icons.Book size={14}/>
          </SocialBtn>
        </div>

      </div>
    </footer>
  );
}
