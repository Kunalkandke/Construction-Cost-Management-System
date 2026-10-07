import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/layout/Seo';
import { GlassCard } from '../../components/ui/GlassCard';
import { Stepper } from '../../components/ui/Stepper';
import { ErrorState, Skeleton } from '../../components/ui/Feedback';
import { useMeta } from '../../hooks/useMeta';
import { useWizardStore } from '../../store/wizardStore';
import { stepValid } from '../../lib/validators';
import { STEPS, WizardNav, SelectionSummary } from '../../components/estimate/wizard/WizardParts';
import { Step1HouseType } from '../../components/estimate/wizard/Step1HouseType';
import { Step2Floors } from '../../components/estimate/wizard/Step2Floors';
import { Step3Config } from '../../components/estimate/wizard/Step3Config';
import { Step4KeyInputs } from '../../components/estimate/wizard/Step4KeyInputs';
import { Step5Addons } from '../../components/estimate/wizard/Step5Addons';
import { Step6Review } from '../../components/estimate/wizard/Step6Review';

const BODY = { 1: Step1HouseType, 2: Step2Floors, 3: Step3Config, 4: Step4KeyInputs, 5: Step5Addons };

export default function EstimateWizard() {
  const { data: meta, isLoading, error, refetch } = useMeta();
  const w = useWizardStore();
  const [params, setParams] = useSearchParams();
  const isFlat = w.houseType === 'FLAT';
  const steps = STEPS.map((s) => ({ ...s, skipped: s.id === 2 && isFlat }));
  const order = steps.filter((s) => !s.skipped).map((s) => s.id);

  // First step the user has not completed: deep links cannot jump ahead of it
  const firstInvalid = () => order.find((id) => id < 6 && !stepValid(id, w, meta)) ?? 6;
  const urlStep = Number(params.get('step')) || 1;

  useEffect(() => {
    if (!meta) return;
    const allowed = Math.min(order.includes(urlStep) ? urlStep : 1, firstInvalid());
    if (allowed !== w.currentStep) w.set({ currentStep: allowed });
    if (allowed !== urlStep) setParams({ step: String(allowed) }, { replace: true });
  }, [meta, urlStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (id) => setParams({ step: String(id) }); // pushes history so the browser back button moves one step back
  const idx = order.indexOf(w.currentStep);
  const next = () => goTo(order[Math.min(order.length - 1, idx + 1)]);
  const back = () => goTo(order[Math.max(0, idx - 1)]);

  if (error) return <div className="container-page py-10"><GlassCard><ErrorState error={error} onRetry={refetch} title="Could not load options" /></GlassCard></div>;
  if (isLoading || !meta) return <div className="container-page max-w-[880px] space-y-3 py-10"><Skeleton className="h-10" /><Skeleton className="h-72" /></div>;

  const Body = BODY[w.currentStep];
  return (
    <div className="container-page py-8">
      <Seo title="Start your estimate" description="Answer a few simple questions and get a detailed construction cost estimate." />
      <h1 className="sr-only">Construction cost estimate wizard</h1>
      <div className="mx-auto grid max-w-[1100px] gap-6 lg:grid-cols-[1fr_200px]">
        <div className="order-2 lg:order-1">
          <GlassCard strong className="mx-auto max-w-[880px]">
            <Stepper steps={steps} current={w.currentStep} onStep={goTo} />
            <div className="mt-8">
              {w.currentStep === 6 ? <Step6Review meta={meta} goTo={goTo} /> : <Body meta={meta} />}
            </div>
            {w.currentStep < 6 && <WizardNav hideBack={idx === 0} onBack={back} onNext={next} nextDisabled={!stepValid(w.currentStep, w, meta)} nextLabel={w.currentStep === 5 ? 'Review' : 'Next'} />}
            {w.currentStep === 6 && <div className="mt-6"><button type="button" onClick={back} className="text-sm font-semibold text-brand-700">Back</button></div>}
          </GlassCard>
        </div>
        <div className="order-1 lg:order-2"><SelectionSummary meta={meta} /></div>
      </div>
    </div>
  );
}
