export type FeedbackStyleAuthoringExpectation =
  | 'setup-style-plan-recorded'
  | 'setup-style-plan-unused'
  | 'author-token-accepted'
  | 'selection-token-accepted-other-variants-rejected';

export type FeedbackStyleAuthoringCase = {
  id: string;
  title: string;
  specCase: string;
  covers: readonly string[];
  tokens: readonly string[];
  expectation: FeedbackStyleAuthoringExpectation;
};

export const FEEDBACK_STYLE_AUTHORING_CASES = [
  {
    id: 'setup-use-records-style-plan',
    title: 'setup use records a visual style plan',
    specCase: 'T-FEEDBACK-STYLE-0001-CASE-SETUP-USE',
    covers: ['C-FEEDBACK-STYLE-0001-A', 'C-FEEDBACK-STYLE-0001-B', 'C-FEEDBACK-STYLE-0002-A'],
    tokens: ['bg-blue-500', 'text-white'],
    expectation: 'setup-style-plan-recorded',
  },
  {
    id: 'setup-unuse-removes-exact-contribution',
    title: 'setup unUse removes only the use contribution it came from',
    specCase: 'T-FEEDBACK-STYLE-0001-CASE-SETUP-UNUSE',
    covers: ['C-FEEDBACK-STYLE-0002-C', 'C-FEEDBACK-STYLE-0002-D'],
    tokens: ['bg-red-500', 'text-white'],
    expectation: 'setup-style-plan-unused',
  },
  {
    id: 'author-token-subset-accepted',
    title: 'author-side style tokens are accepted as Proto UI feedback.style tokens',
    specCase: 'T-FEEDBACK-STYLE-0001-CASE-AUTHOR-TOKENS',
    covers: ['C-FEEDBACK-STYLE-0003-A', 'C-FEEDBACK-STYLE-0003-B'],
    tokens: ['opacity-50', 'px-2.5', 'text-[0.8rem]'],
    expectation: 'author-token-accepted',
  },
  {
    id: 'selection-token-allowlist',
    title: 'only the static text-selection pseudo-element variant is accepted',
    specCase: 'T-FEEDBACK-STYLE-0001-CASE-TOKEN-PURITY',
    covers: ['C-FEEDBACK-STYLE-0004-A', 'C-FEEDBACK-STYLE-0004-B', 'C-FEEDBACK-STYLE-0004-F'],
    tokens: ['selection:bg-primary', 'hover:bg-white', 'data-[disabled]:opacity-50'],
    expectation: 'selection-token-accepted-other-variants-rejected',
  },
] as const satisfies readonly FeedbackStyleAuthoringCase[];

export const FEEDBACK_STYLE_AUTHORING_SPEC_CASES = [
  ...new Set(FEEDBACK_STYLE_AUTHORING_CASES.map((testCase) => testCase.specCase)),
] as const;
