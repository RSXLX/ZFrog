import { FamilyLookupCard } from '../features/social/components/FamilyLookupCard';

export function FamiliesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Families V2 Entry</h1>
        <p className="mt-1 text-sm text-slate-600">
          Official Family entry for V2 flow: create family, then continue to community and
          attestation steps.
        </p>
      </header>
      <FamilyLookupCard />
    </div>
  );
}

export default FamiliesPage;
