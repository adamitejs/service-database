const DatabaseCommands = require("../../src/DatabaseCommands");

const mockService = () => {
  return {
    config: {
      database: {
        adapter: {},

        rules: {}
      }
    }
  };
};

describe("DatabaseCommands", () => {
  it("Can be constructed", () => {
    //const x = new DatabaseCommands(mockService);
  });
});
