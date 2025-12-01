import Navbar from "@/components/Navbar";
import CommunityChat from "@/components/CommunityChat";
import { Globe } from "lucide-react";

const Community = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 mt-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-hero rounded-full flex items-center justify-center">
                <Globe className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Travelers Community Chat</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Connect with travelers from around the world. Share tips, stories, ask questions, and make new friends before you even start your journey!
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <CommunityChat />
          </div>
          
          <div className="mt-8 text-center text-sm text-muted-foreground max-w-3xl mx-auto">
            <p>
              💬 This is a global chat room for all travelers. Be respectful, share your experiences, and help fellow adventurers plan their perfect trips!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
