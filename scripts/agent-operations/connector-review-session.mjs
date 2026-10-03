// Parent-owned review session. No model/reviewer is invoked by this helper.
import { createHash } from 'node:crypto';
import {
  authorizeReviewSubmission,
  computeReviewInputDigest,
  verifyLiveReviewInput,
} from './review-runtime.mjs';
import { summarizeLiveChecks, summarizeLiveDco } from './collect-live-review-input.mjs';
import { LEDGER_PRINCIPAL, LEDGER_REPOSITORY } from './cloud-review-ledger.mjs';

export const CONNECTOR_AUTHORIZATION = 'proto-ui-cloud-owner-review-v1';
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const INITIAL_SWEEP_AUTHORIZATION = 'proto-ui-cloud-owner-initial-sweep-v1';
export const INITIAL_SWEEP_ID = 'owner-requested-open-pr-sweep-2026-10-03';
const identity = (live) => [
  live.reviewerId,
  live.viewerLogin,
  live.authorId,
  live.authorLogin,
  live.permission,
  live.contributors,
];

export class ConnectorReviewSession {
  #transport;
  #ledger;
  #policy;
  #initial;
  #priorPacket = null;
  #used = false;
  #source = 'delegated-owner-event';
  #authorizationId = CONNECTOR_AUTHORIZATION;
  constructor({ transport, ledger, policy }) {
    this.#transport = transport;
    this.#ledger = ledger;
    this.#policy = structuredClone(policy);
  }
  async begin(pullRequest, event) {
    assert(!this.#initial && !this.#used, 'one parent-review lifecycle per session');
    assert(
      event &&
        [
          'opened',
          'ready_for_review',
          'closed',
          'synchronize',
          'human-review',
          'human-comment',
        ].includes(event.kind),
      'unsupported event hint'
    );
    assert(
      this.#policy.reviewSubmissionAuthorizations.find(
        (scope) => scope.id === CONNECTOR_AUTHORIZATION
      )?.status === 'active',
      'event scope is not active'
    );
    this.#source = 'delegated-owner-event';
    this.#authorizationId = CONNECTOR_AUTHORIZATION;
    return this.#begin(pullRequest, event);
  }
  async beginInitialSweep(pullRequest) {
    assert(!this.#initial && !this.#used, 'one parent-review lifecycle per session');
    const scope = this.#policy.reviewSubmissionAuthorizations.find(
      (x) => x.id === INITIAL_SWEEP_AUTHORIZATION
    );
    assert(
      scope?.status === 'active' && scope.initialSweepId === INITIAL_SWEEP_ID,
      'initial sweep needs its separately admitted exact scope'
    );
    this.#source = 'delegated-owner-initial-sweep';
    this.#authorizationId = INITIAL_SWEEP_AUTHORIZATION;
    return this.#begin(pullRequest, {
      kind: 'initial-sweep',
      deliveryId: `${INITIAL_SWEEP_ID}:${pullRequest}`,
    });
  }
  async #begin(pullRequest, event) {
    const live = await this.#transport.collect(pullRequest);
    if (event.kind === 'initial-sweep')
      assert(
        live.input.pullRequestState === 'OPEN',
        'initial sweep admits only currently open PRs'
      );
    const before = await this.#ledger.read();
    assert(
      before.state.publicationEnabled === true,
      'production ledger must be explicitly provisioned'
    );
    // Ignore only a proven review object published by this ledger, not every
    // human comment/review under the delegated account.
    if (
      event.reviewId &&
      before.state.publicationReceipts.some(
        (r) => r.pullRequest === pullRequest && r.id === String(event.reviewId)
      )
    ) {
      return { skipped: true, reason: 'own published review wake-up', publicationAllowed: false };
    }
    const material = {
      headSha: live.input.headSha,
      state: live.input.pullRequestState,
      draft: live.input.isDraft,
      body: live.input.pullRequestBody,
      commits: live.input.commits,
      files: live.input.changedFiles,
      reviews: live.input.reviews.filter(
        (review) =>
          !before.state.publicationReceipts.some((receipt) => receipt.nodeId === review.id)
      ),
      comments: live.input.comments,
      replies: live.input.replies,
      threads: live.input.threads,
    };
    const queued = await this.#ledger.apply(before.revision, {
      type: 'enqueue',
      deliveryId: event.deliveryId,
      pullRequest,
      eventKind: event.kind,
      materialDigest: hash(material),
    });
    assert(queued.status === 'applied', 'enqueue not confirmed; stop without retry');
    const admitted = await this.#ledger.read();
    if (!admitted.state.pending.some((x) => x.pullRequest === pullRequest))
      return { skipped: true, reason: 'unchanged material', publicationAllowed: false };
    if (admitted.state.slot !== null)
      return { queued: true, reason: 'global slot occupied', publicationAllowed: false };
    const claimed = await this.#ledger.apply(admitted.revision, { type: 'claim', pullRequest });
    assert(claimed.status === 'applied', 'claim not confirmed; stop without retry');
    this.#initial = structuredClone(live);
    this.#priorPacket =
      before.state.analyses.find((x) => x.input.pullRequest === pullRequest)?.packet ?? null;
    return {
      kind: 'proto-ui.parent-review-request',
      executionMode: 'autonomous',
      executionModeSource: this.#source,
      input: structuredClone(live.input),
      inputDigest: computeReviewInputDigest(live.input),
      identity: identity(live),
      coverage: live.coverage,
      priorAnalysis: before.state.analyses.find((x) => x.input.pullRequest === pullRequest) ?? null,
      instruction:
        'Parent inspects actual diff and evidence, reconciles prior findings, and supplies its own packet; helper does not judge.',
    };
  }
  #authorize(packet, live, assessment) {
    assert(
      !live.contributionGap && !live.contributed,
      'independent contributor identity unavailable or reviewer contributed'
    );
    assert(
      hash(identity(live)) === hash(identity(this.#initial)),
      'live identity/permission changed'
    );
    assert(
      packet.agentEvidence?.source?.includes('AI-executed review by ChatGPT'),
      'honest AI attribution required in rendered evidence'
    );
    assert(
      packet.agentEvidence.disposition === 'complete' &&
        packet.agentEvidence.debt.length === 0 &&
        packet.humanGates.length === 0,
      'complete evidence and no human-maintainer judgment gate required'
    );
    const authorization = authorizeReviewSubmission({
      packet,
      input: this.#initial.input,
      liveInput: live.input,
      executionMode: 'autonomous',
      executionModeSource: this.#source,
      authorizationId: this.#authorizationId,
      policy: this.#policy,
      priorPacket: this.#priorPacket,
      dcoConclusion: summarizeLiveDco(live.input.checks, {
        repositoryId: LEDGER_REPOSITORY,
        trustedRepositoryId: this.#policy.trustedDcoEvidence?.repositoryId,
        trustedCheckName: this.#policy.trustedDcoEvidence?.checkName,
        trustedSource: this.#policy.trustedDcoEvidence?.source,
        trustedProviderId: this.#policy.trustedDcoEvidence?.providerId,
        trustedDetailsUrl: this.#policy.trustedDcoEvidence?.detailsUrl,
      }),
      selfAssessment: assessment,
      credentialCanReview: ['admin', 'write', 'maintain'].includes(live.permission),
      reviewer: live.viewerLogin,
      pullRequestAuthor: live.authorLogin,
      ciConclusion: summarizeLiveChecks(live.input.checks, {
        repositoryId: LEDGER_REPOSITORY,
        trustedRepositoryId: this.#policy.trustedCiEvidence?.repositoryId,
        trustedSource: this.#policy.trustedCiEvidence?.source,
        trustedCheckNames: this.#policy.trustedCiEvidence?.checkNames,
        trustedWorkflowNames: this.#policy.trustedCiEvidence?.workflowNames,
        trustedWorkflowPaths: this.#policy.trustedCiEvidence?.workflowPaths,
      }),
    });
    assert(authorization.allowed, `canonical publication gate: ${authorization.reason}`);
    const scope = this.#policy.reviewSubmissionAuthorizations.find(
      (x) => x.id === this.#authorizationId
    );
    assert(
      scope.principalId === LEDGER_PRINCIPAL.id && scope.principalLogin === LEDGER_PRINCIPAL.login,
      'standing scope principal mismatch'
    );
    return authorization;
  }
  async publishParentPacket(packet, assessment) {
    assert(
      this.#initial && !this.#used,
      'parent-review request required; one publication attempt per session'
    );
    this.#used = true;
    const live = await this.#transport.collect(this.#initial.input.pullRequest);
    this.#authorize(packet, live, assessment);
    const before = await this.#ledger.read();
    const staged = await this.#ledger.apply(before.revision, {
      type: 'stagePublicationIntent',
      input: this.#initial.input,
      packet,
      liveInput: live.input,
      observation: {
        executionMode: 'autonomous',
        executionModeSource: this.#source,
        reviewerId: live.reviewerId,
        reviewerLogin: live.viewerLogin,
        authorId: live.authorId,
        authorLogin: live.authorLogin,
        policyDigest: hash(this.#policy),
      },
    });
    assert(
      staged.status === 'applied',
      'intent acknowledgement unavailable; never submit or retry'
    );
    const intent = (await this.#ledger.read()).state.slot.intent;
    await this.#ledger.consumePublicationAttempt(intent.id);
    try {
      const final = await this.#transport.collect(live.input.pullRequest);
      this.#authorize(intent.analysis.packet, final, assessment);
      verifyLiveReviewInput(intent.analysis.packet, final.input);
      const current = (await this.#ledger.read()).state;
      assert(
        current.slot?.intent?.id === intent.id &&
          current.pending.find((x) => x.pullRequest === intent.pullRequest)?.generation ===
            current.slot.generation,
        'material generation changed before review request'
      );
      const receipt = await this.#transport.submit(intent.pullRequest, intent);
      const snapshot = await this.#ledger.read();
      const finalized = await this.#ledger.apply(snapshot.revision, {
        type: 'finalizePublication',
        response: receipt,
        readback: receipt,
      });
      assert(finalized.status === 'applied', 'publication receipt persistence uncertain');
      return {
        status: 'published',
        receipt,
        checkpoint: finalized.checkpoint ?? finalized.revision,
        retryAllowed: false,
      };
    } catch (error) {
      return { status: 'unknown', intentId: intent.id, reason: error.message, retryAllowed: false };
    }
  }
  async abandonBeforeIntent() {
    const snapshot = await this.#ledger.read();
    assert(snapshot.state.slot?.intent === null, 'cannot abandon a persisted or uncertain intent');
    this.#used = true;
    return this.#ledger.apply(snapshot.revision, { type: 'abandon' });
  }
  async finishParentAnalysis(packet) {
    assert(
      this.#initial && !this.#used,
      'parent-review request required; lifecycle already consumed'
    );
    this.#used = true;
    const live = await this.#transport.collect(this.#initial.input.pullRequest);
    assert(
      hash(identity(live)) === hash(identity(this.#initial)),
      'live identity/permission changed'
    );
    const snapshot = await this.#ledger.read();
    return this.#ledger.apply(snapshot.revision, {
      type: 'finishAnalysis',
      input: this.#initial.input,
      packet,
      liveInput: live.input,
      observation: {
        executionMode: 'autonomous',
        executionModeSource: this.#source,
        reviewerId: live.reviewerId,
        reviewerLogin: live.viewerLogin,
        authorId: live.authorId,
        authorLogin: live.authorLogin,
        policyDigest: hash(this.#policy),
      },
    });
  }
}
