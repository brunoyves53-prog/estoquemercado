import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import BeamsBackground from '@/components/BeamsBackground';
import MobileNav from '@/components/MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import logoImage from '@/assets/logo-honest-market.png';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <BeamsBackground />
        {!isMobile && <AppSidebar />}
        <div className="flex-1 flex flex-col relative z-10">
          <header className="h-14 flex items-center border-b border-border bg-background/60 backdrop-blur-lg px-4">
            {!isMobile && <SidebarTrigger className="mr-3" />}
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        {isMobile && <MobileNav />}
      </div>
    </SidebarProvider>
  );
}
