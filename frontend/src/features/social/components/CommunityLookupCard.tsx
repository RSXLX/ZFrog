import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import EmptyState from '../../../components/common/EmptyState';
import {
  socialFeatureApi,
  type CommunityJoinResultV2,
  type CommunityMembersReadModelV2,
  type CommunityReadModelV2,
  type RelationshipAttestationReadModelV2,
  type SubmitRelationshipAttestationOnchainResultV2,
} from '../api';
import { SOCIAL_V2_FLOW_DRAFT_KEY, type SocialV2FlowDraft } from '../constants';

type JoinRole = 'member' | 'moderator';

const toPositiveInt = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const readFlowDraft = (): SocialV2FlowDraft | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(SOCIAL_V2_FLOW_DRAFT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SocialV2FlowDraft>;
    if (
      !parsed ||
      !Number.isInteger(parsed.familyId) ||
      !Number.isInteger(parsed.ownerFrogId) ||
      typeof parsed.familyName !== 'string'
    ) {
      return null;
    }

    return {
      familyId: parsed.familyId,
      familyName: parsed.familyName,
      ownerFrogId: parsed.ownerFrogId,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export function CommunityLookupCard() {
  const [communityId, setCommunityId] = useState('');
  const [memberLimit, setMemberLimit] = useState('50');
  const [joinFrogId, setJoinFrogId] = useState('');
  const [joinRole, setJoinRole] = useState<JoinRole>('member');
  const [flowDraft, setFlowDraft] = useState<SocialV2FlowDraft | null>(null);

  const [community, setCommunity] = useState<CommunityReadModelV2 | null>(null);
  const [members, setMembers] = useState<CommunityMembersReadModelV2 | null>(null);

  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [joining, setJoining] = useState(false);

  const [attestationSubjectFrogId, setAttestationSubjectFrogId] = useState('');
  const [attestationObjectFrogId, setAttestationObjectFrogId] = useState('');
  const [attestationType, setAttestationType] = useState('bond');
  const [attestationSource, setAttestationSource] = useState('web-social-v2');
  const [attestationEvidenceRaw, setAttestationEvidenceRaw] = useState('');
  const [attesting, setAttesting] = useState(false);
  const [submittingOnchain, setSubmittingOnchain] = useState(false);

  const [attestation, setAttestation] = useState<
    (RelationshipAttestationReadModelV2 & { idempotentReplay: boolean }) | null
  >(null);
  const [onchainResult, setOnchainResult] = useState<SubmitRelationshipAttestationOnchainResultV2 | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const draft = readFlowDraft();
    setFlowDraft(draft);

    if (draft && !joinFrogId) {
      setJoinFrogId(String(draft.ownerFrogId));
    }
    if (draft && !attestationSubjectFrogId) {
      setAttestationSubjectFrogId(String(draft.ownerFrogId));
    }
  }, []);

  const normalizedCommunityId = communityId.trim();

  const ensureCommunityId = (): boolean => {
    if (!normalizedCommunityId) {
      setError('communityId is required');
      return false;
    }
    return true;
  };

  const handleLoadCommunity = async () => {
    if (!ensureCommunityId()) {
      return;
    }

    setLoadingCommunity(true);
    setError('');
    setSuccessMessage('');
    try {
      const data = await socialFeatureApi.getCommunityById(normalizedCommunityId);
      setCommunity(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load community');
      setCommunity(null);
    } finally {
      setLoadingCommunity(false);
    }
  };

  const handleLoadMembers = async () => {
    if (!ensureCommunityId()) {
      return;
    }

    const limit = toPositiveInt(memberLimit);
    if (!limit) {
      setError('member limit must be a positive integer');
      return;
    }

    setLoadingMembers(true);
    setError('');
    setSuccessMessage('');
    try {
      const data = await socialFeatureApi.listCommunityMembers(normalizedCommunityId, limit);
      setMembers(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load members');
      setMembers(null);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleJoinCommunity = async () => {
    if (!ensureCommunityId()) {
      return;
    }

    const frogId = toPositiveInt(joinFrogId);
    if (!frogId) {
      setError('frogId must be a positive integer');
      return;
    }

    setJoining(true);
    setError('');
    setSuccessMessage('');
    try {
      const data: CommunityJoinResultV2 = await socialFeatureApi.joinCommunity({
        communityId: normalizedCommunityId,
        frogId,
        role: joinRole,
      });

      setCommunity(data.community);
      setSuccessMessage(`Joined ${data.community.name} as ${data.membership.role}`);
      if (!attestationSubjectFrogId) {
        setAttestationSubjectFrogId(String(frogId));
      }
      if (members) {
        setMembers({
          ...members,
          memberCount: data.community.memberCount,
          members: [data.membership, ...members.members],
        });
      }
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Failed to join community');
    } finally {
      setJoining(false);
    }
  };

  const parseEvidence = (): Record<string, unknown> | undefined => {
    const raw = attestationEvidenceRaw.trim();
    if (!raw) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('attestation evidence must be a JSON object');
        return undefined;
      }
      return parsed as Record<string, unknown>;
    } catch {
      setError('attestation evidence must be valid JSON');
      return undefined;
    }
  };

  const handleSubmitAttestation = async () => {
    const subjectFrogId = toPositiveInt(attestationSubjectFrogId);
    const objectFrogId = toPositiveInt(attestationObjectFrogId);
    const normalizedType = attestationType.trim();

    if (!subjectFrogId || !objectFrogId) {
      setError('subjectFrogId and objectFrogId must be positive integers');
      return;
    }
    if (subjectFrogId === objectFrogId) {
      setError('subjectFrogId and objectFrogId must be different');
      return;
    }
    if (!normalizedType) {
      setError('attestationType is required');
      return;
    }

    const evidence = parseEvidence();
    if (attestationEvidenceRaw.trim() && !evidence) {
      return;
    }

    setAttesting(true);
    setError('');
    setSuccessMessage('');
    setOnchainResult(null);
    try {
      const result = await socialFeatureApi.createRelationshipAttestation({
        subjectFrogId,
        objectFrogId,
        attestationType: normalizedType,
        source: attestationSource.trim() || 'web-social-v2',
        ...(evidence ? { evidence } : {}),
      });

      setAttestation(result);
      setSuccessMessage(`Attestation submitted: ${result.id}`);
    } catch (attestError) {
      setError(attestError instanceof Error ? attestError.message : 'Failed to submit attestation');
    } finally {
      setAttesting(false);
    }
  };

  const handleSubmitOnchain = async () => {
    if (!attestation) {
      setError('submit attestation first');
      return;
    }

    setSubmittingOnchain(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await socialFeatureApi.submitRelationshipAttestationOnchain(attestation.id);
      setOnchainResult(result);
      setSuccessMessage(
        result.trace?.txHash
          ? `Onchain submission confirmed: ${result.trace.txHash}`
          : `Onchain submission status: ${result.status}`
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit onchain');
    } finally {
      setSubmittingOnchain(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="community-entry-card">
      {flowDraft && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
          Family draft detected: <span className="font-semibold">{flowDraft.familyName}</span> (ID {flowDraft.familyId}) · Owner Frog #{flowDraft.ownerFrogId}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <input
          value={communityId}
          onChange={(event) => setCommunityId(event.target.value)}
          placeholder="Input communityId"
          data-testid="community-id-input"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button
          type="button"
          onClick={handleLoadCommunity}
          disabled={loadingCommunity}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingCommunity ? 'Loading...' : 'Load Community'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <input
          value={joinFrogId}
          onChange={(event) => setJoinFrogId(event.target.value)}
          placeholder="frogId for join"
          data-testid="community-join-frog-input"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <select
          value={joinRole}
          onChange={(event) => setJoinRole(event.target.value as JoinRole)}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          <option value="member">member</option>
          <option value="moderator">moderator</option>
        </select>
        <button
          type="button"
          onClick={handleJoinCommunity}
          disabled={joining}
          data-testid="community-join-submit"
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {joining ? 'Joining...' : 'Join Community'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={memberLimit}
          onChange={(event) => setMemberLimit(event.target.value)}
          placeholder="member limit"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button
          type="button"
          onClick={handleLoadMembers}
          disabled={loadingMembers}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingMembers ? 'Loading...' : 'Load Members'}
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4" data-testid="attestation-form">
        <p className="text-sm font-semibold text-indigo-900">Step 3 · Submit Relationship Attestation</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={attestationSubjectFrogId}
            onChange={(event) => setAttestationSubjectFrogId(event.target.value)}
            placeholder="subjectFrogId"
            data-testid="attestation-subject-input"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <input
            value={attestationObjectFrogId}
            onChange={(event) => setAttestationObjectFrogId(event.target.value)}
            placeholder="objectFrogId"
            data-testid="attestation-object-input"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <input
            value={attestationType}
            onChange={(event) => setAttestationType(event.target.value)}
            placeholder="attestationType"
            data-testid="attestation-type-input"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <input
            value={attestationSource}
            onChange={(event) => setAttestationSource(event.target.value)}
            placeholder="source (optional)"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <textarea
          value={attestationEvidenceRaw}
          onChange={(event) => setAttestationEvidenceRaw(event.target.value)}
          placeholder='evidence JSON (optional), e.g. {"channel":"web"}'
          className="mt-3 h-24 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSubmitAttestation}
            disabled={attesting}
            data-testid="attestation-submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {attesting ? 'Submitting...' : 'Submit Attestation'}
          </button>
          <button
            type="button"
            onClick={handleSubmitOnchain}
            disabled={submittingOnchain || !attestation}
            data-testid="attestation-submit-onchain"
            className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submittingOnchain ? 'Submitting...' : 'Submit Onchain'}
          </button>
        </div>

        {attestation && (
          <div className="mt-3 rounded-lg border border-indigo-200 bg-white p-3 text-sm text-slate-700" data-testid="attestation-success">
            <p className="font-semibold">Attestation #{attestation.id}</p>
            <p>Status: {attestation.status}</p>
            <p>Replay: {attestation.idempotentReplay ? 'yes' : 'no'}</p>
          </div>
        )}

        {onchainResult && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" data-testid="attestation-onchain-result">
            <p className="font-semibold">Onchain status: {onchainResult.status}</p>
            <p>Replay: {onchainResult.idempotentReplay ? 'yes' : 'no'}</p>
            <p>Tx: {onchainResult.trace?.txHash || 'n/a'}</p>
          </div>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {successMessage && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" data-testid="community-flow-success">
          {successMessage}
        </p>
      )}

      {!community && !members && !error && (
        <div className="mt-4">
          <EmptyState
            icon={Building2}
            title="No community loaded"
            description="Load a community to view profile, join, and inspect members."
            className="rounded-xl border border-dashed border-gray-200"
          />
        </div>
      )}

      {community && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4" data-testid="community-details">
          <h3 className="text-lg font-semibold text-slate-800">{community.name}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {community.id} | {community.credentialType} | Members: {community.memberCount}
          </p>
          <p className="mt-1 text-sm text-slate-600">{community.description || 'No description'}</p>
        </div>
      )}

      {members && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Members ({members.members.length}/{members.memberCount})
          </p>
          {members.members.length === 0 ? (
            <p className="text-sm text-slate-500">No members returned.</p>
          ) : (
            <ul className="space-y-2">
              {members.members.map((member, index) => (
                <li
                  key={`${member.userAddress}-${index}`}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  {member.userAddress} | role={member.role} | frogId={member.frogId ?? 'n/a'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
