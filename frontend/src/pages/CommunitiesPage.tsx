import { CommunityLookupCard } from '../features/social/components/CommunityLookupCard';

export function CommunitiesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Communities V2 Entry</h1>
        <p className="mt-1 text-sm text-slate-600">
          Official Community entry for V2 flow: join community, then submit relationship
          attestation (with optional onchain submission).
        </p>
      </header>
      <CommunityLookupCard />
    </div>
  );
}

export default CommunitiesPage;
