const RuleValidator = require("../../rules/RuleValidator");

const { DocumentReference, CollectionReference } = require("@adamite/sdk");

function MockDocumentReference(databaseName, collectionName) {
  this.collection = {
    name: collectionName,
    database: {
      name: databaseName
    }
  };
}

MockDocumentReference.prototype = DocumentReference.prototype;

function MockCollectionReference(databaseName, collectionName) {
  this.name = collectionName;
  this.database = {
    name: databaseName
  };
}
MockCollectionReference.prototype = CollectionReference.prototype;

describe("RuleValidator", () => {
  it("Can be constructed", () => {
    const x = new RuleValidator(null);
  });

  describe("getRuleForRef", () => {
    it("returns undefined if ref is not Document or Collection.", () => {
      const x = new RuleValidator({});

      const result = x.getRuleForRef({}, "");

      expect(result).toBe(undefined);
    });

    describe("with Document ref", () => {
      it("returns undefined if db name IS NOT found.", () => {
        const doc = new MockDocumentReference("foo", "bar");
        const x = new RuleValidator({});
        const result = x.getRuleForRef(doc, "");
        expect(result).toBe(undefined);
      });

      it("returns undefined if db name IS found, and collection IS NOT found.", () => {
        const doc = new MockDocumentReference("foo", "bar");
        const x = new RuleValidator({ foo: {} });
        const result = x.getRuleForRef(doc, "");
        expect(result).toBe(undefined);
      });

      it("returns operation rule if db name IS found, and collection IS found.", () => {
        const doc = new MockDocumentReference("foo", "bar");

        const x1 = new RuleValidator({ foo: { bar: {} } });
        const result1 = x1.getRuleForRef(doc, "tickle");
        expect(result1).toBe(undefined);

        const x2 = new RuleValidator({ foo: { bar: { tickle: 42 } } });
        const result2 = x2.getRuleForRef(doc, "tickle");
        expect(result2).toBe(42);
      });
    });

    describe("with Collection ref", () => {
      it("returns undefined if db name IS NOT found.", () => {
        const col = new MockCollectionReference("foo", "bar");
        const x = new RuleValidator({});
        const result = x.getRuleForRef(col, "");
        expect(result).toBe(undefined);
      });

      it("returns undefined if db name IS found, and collection IS NOT found.", () => {
        const col = new MockCollectionReference("foo", "bar");
        const x = new RuleValidator({ foo: {} });
        const result = x.getRuleForRef(col, "");
        expect(result).toBe(undefined);
      });

      it("returns operation rule if db name IS found, and collection IS found.", () => {
        const col = new MockCollectionReference("foo", "bar");

        const x1 = new RuleValidator({ foo: { bar: {} } });
        const result1 = x1.getRuleForRef(col, "tickle");
        expect(result1).toBe(undefined);

        const x2 = new RuleValidator({ foo: { bar: { tickle: 42 } } });
        const result2 = x2.getRuleForRef(col, "tickle");
        expect(result2).toBe(42);
      });
    });
  });
});
