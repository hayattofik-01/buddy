import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface OnboardingCardProps {
  children: ReactNode;
  isActive: boolean;
  index: number;
  currentStep: number;
}

export const OnboardingCard = ({ children, isActive, index, currentStep }: OnboardingCardProps) => {
  // Only render current and upcoming cards
  if (index < currentStep) return null;
  
  const offset = (index - currentStep) * 20;
  const scale = isActive ? 1 : 0.95;
  const opacity = isActive ? 1 : 0.3;

  return (
    <div
      className="absolute inset-0 transition-all duration-300 ease-out"
      style={{
        transform: `translateY(${offset}px) scale(${scale})`,
        opacity,
        zIndex: 50 - index,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <Card className="h-full p-6 bg-card/100 backdrop-blur-sm border-2">
        {children}
      </Card>
    </div>
  );
};
