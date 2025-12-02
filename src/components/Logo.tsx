import { Compass } from "lucide-react";

const Logo = ({ className = "h-6 w-6" }: { className?: string }) => {
    return (
        <div className="flex items-center gap-2 text-xl font-bold text-primary">
            <Compass className={className} />
            <span>Buddy</span>
        </div>
    );
};

export default Logo;
