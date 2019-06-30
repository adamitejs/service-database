const RuleError = require("../../rules/RuleError");

describe("RuleError", () => {
  it("Can be constructed", () => {
    const x = new RuleError("Mock Error");
    expect(x.message).toBe("Mock Error");
  });
});
