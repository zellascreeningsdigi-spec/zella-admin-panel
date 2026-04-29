import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, className }) => {
  const current = steps.find(s => s.id === currentStep) ?? steps[0];
  const totalSteps = steps.length;
  const progressPct = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 100;

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: compact progress bar with current step label */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-green text-white font-semibold text-sm shrink-0">
              {currentStep}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-green truncate">{current?.title}</p>
              {current?.description && (
                <p className="text-xs text-gray-500 truncate">{current.description}</p>
              )}
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 shrink-0 ml-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Desktop / tablet: full stepper */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isUpcoming = currentStep < step.id;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 shrink-0',
                    {
                      'bg-brand-green border-brand-green text-white': isCompleted,
                      'bg-brand-green border-brand-green text-white shadow-lg scale-110': isCurrent,
                      'bg-white border-gray-300 text-gray-400': isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <span className="text-lg font-semibold">{step.id}</span>
                  )}
                </div>

                <div className="mt-3 text-center px-1 min-w-0">
                  <p
                    className={cn('text-sm font-medium truncate', {
                      'text-brand-green': isCompleted || isCurrent,
                      'text-gray-500': isUpcoming,
                    })}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{step.description}</p>
                  )}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 lg:mx-4 transition-all duration-300 -mt-12',
                    {
                      'bg-brand-green': currentStep > step.id,
                      'bg-gray-300': currentStep <= step.id,
                    }
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
