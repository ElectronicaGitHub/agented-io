import { EAgentResponseType } from '../enums';
import { isValidAgentResponse } from '../utils/agent-validation';

describe('isValidAgentResponse', () => {
  it('accepts valid text and function actions', () => {
    expect(isValidAgentResponse({
      actions: [
        { type: EAgentResponseType.TEXT, text: 'working' },
        { type: EAgentResponseType.FUNCTION, functionName: 'search', paramsToPass: { query: 'test' } },
      ],
      finished: false,
    })).toBe(true);
  });

  it('rejects a function action without paramsToPass', () => {
    expect(isValidAgentResponse({
      actions: [{ type: EAgentResponseType.FUNCTION, functionName: 'search' }],
      finished: false,
    })).toBe(false);
  });
});
