import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Users } from 'lucide-react';
import EmptyState from '../../../components/common/EmptyState';
import { SOCIAL_V2_FLOW_DRAFT_KEY, type SocialV2FlowDraft } from '../constants';
import {
  socialFeatureApi,
  type FamilyReadModelV2,
  type FamilyVisibility,
} from '../api';

const parsePositiveInt = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export function FamilyLookupCard() {
  const [createName, setCreateName] = useState('');
  const [createOwnerFrogId, setCreateOwnerFrogId] = useState('');
  const [createGoal, setCreateGoal] = useState('');
  const [createVisibility, setCreateVisibility] = useState<FamilyVisibility>('private');
  const [creating, setCreating] = useState(false);

  const [familyIdInput, setFamilyIdInput] = useState('');
  const [family, setFamily] = useState<FamilyReadModelV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const createFamily = async () => {
    const name = createName.trim();
    const ownerFrogId = parsePositiveInt(createOwnerFrogId);
    const goal = createGoal.trim();

    if (name.length < 2 || name.length > 32) {
      setError('family name must be 2-32 characters');
      return;
    }
    if (!ownerFrogId) {
      setError('ownerFrogId must be a positive integer');
      return;
    }

    setCreating(true);
    setError('');
    setSuccessMessage('');
    try {
      const created = await socialFeatureApi.createFamily({
        name,
        ownerFrogId,
        goal: goal || undefined,
        visibility: createVisibility,
      });

      setFamily(created);
      setFamilyIdInput(String(created.id));
      setSuccessMessage(
        `Family ${created.name} created (ID ${created.id}). Continue with community join next.`
      );

      if (typeof window !== 'undefined') {
        const draft: SocialV2FlowDraft = {
          familyId: created.id,
          familyName: created.name,
          ownerFrogId: created.ownerFrogId,
          createdAt: new Date().toISOString(),
        };
        window.localStorage.setItem(SOCIAL_V2_FLOW_DRAFT_KEY, JSON.stringify(draft));
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create family');
    } finally {
      setCreating(false);
    }
  };

  const loadFamily = async () => {
    const familyId = parsePositiveInt(familyIdInput);
    if (!familyId) {
      setError('familyId must be a positive integer');
      setFamily(null);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const data = await socialFeatureApi.getFamilyById(familyId);
      setFamily(data);
    } catch (fetchError) {
      setFamily(null);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch family');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="family-entry-card">
      <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <p className="text-sm font-semibold text-emerald-800">Step 1 · Create Family</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Family name"
            data-testid="family-create-name-input"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          />
          <input
            value={createOwnerFrogId}
            onChange={(event) => setCreateOwnerFrogId(event.target.value)}
            placeholder="Owner frogId"
            data-testid="family-create-owner-input"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          />
          <input
            value={createGoal}
            onChange={(event) => setCreateGoal(event.target.value)}
            placeholder="Goal (optional)"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          />
          <select
            value={createVisibility}
            onChange={(event) => setCreateVisibility(event.target.value as FamilyVisibility)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="private">private</option>
            <option value="friends">friends</option>
            <option value="public">public</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createFamily}
            disabled={creating}
            data-testid="family-create-submit"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create Family'}
          </button>
          <Link
            to="/communities"
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"
          >
            Continue to Communities
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={familyIdInput}
          onChange={(event) => setFamilyIdInput(event.target.value)}
          placeholder="Input familyId, e.g. 1"
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button
          type="button"
          onClick={loadFamily}
          disabled={loading}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load Family'}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {successMessage && (
        <p
          className="mb-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800"
          data-testid="family-create-success"
        >
          {successMessage}
        </p>
      )}

      {!family && !error && (
        <EmptyState
          icon={Users}
          title="No family selected"
          description="Create a family or enter familyId to load V2 family read model."
          className="rounded-xl border border-dashed border-gray-200"
        />
      )}

      {family && (
        <div className="space-y-4" data-testid="family-details">
          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-800">{family.name}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Owner Frog #{family.ownerFrogId} | Visibility: {family.visibility}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Goal: {family.goal || 'No goal yet'} | Members: {family.memberCount}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Members</p>
            {family.members.length === 0 ? (
              <p className="text-sm text-slate-500">No members</p>
            ) : (
              <ul className="space-y-2">
                {family.members.map((member) => (
                  <li
                    key={member.frogId}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    Frog #{member.frogId} ({member.role}) - {member.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
