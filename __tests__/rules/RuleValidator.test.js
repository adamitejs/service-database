const { RuleValidator, RuleError } = require("../../rules");

const { DocumentReference, CollectionReference } = require("@adamite/sdk");

function getterTrackingProxy(objName) {
  const gets = [];
  const _getterTrackingProxy = objName =>
    new Proxy(
      {},
      {
        get: function(target, name) {
          gets.push(`${objName}.${name}`);
          return _getterTrackingProxy(`${objName}.${name}`);
        }
      }
    );

  return [gets, _getterTrackingProxy(objName)];
}

/*TODO: hack mocks - could be done better */
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
  let ruleValidator;
  let doc;
  let col;

  beforeEach(() => {
    ruleValidator = new RuleValidator({});
    doc = new MockDocumentReference();
    col = new MockCollectionReference();
  });

  it("Can be constructed", () => {
    const x = new RuleValidator(null);
  });

  describe("getRuleForRef", () => {
    beforeEach(() => {
      ruleValidator.getDocumentRule = jest.fn();
      ruleValidator.getCollectionRule = jest.fn();
    });

    it("returns undefined for unknown refs", () => {
      expect(ruleValidator.getRuleForRef({}, "tickle")).toBe(undefined);
      expect(ruleValidator.getDocumentRule.mock.calls.length).toBe(0);
      expect(ruleValidator.getCollectionRule.mock.calls.length).toBe(0);
    });

    it("can get document rules for document refs", () => {
      expect(ruleValidator.getRuleForRef(doc, "tickle")).toBe(undefined);
      expect(ruleValidator.getDocumentRule.mock.calls.length).toBe(1);
      expect(ruleValidator.getCollectionRule.mock.calls.length).toBe(0);
    });

    it("can get collection rules for collection refs", () => {
      expect(ruleValidator.getRuleForRef(col, "tickle")).toBe(undefined);
      expect(ruleValidator.getDocumentRule.mock.calls.length).toBe(0);
      expect(ruleValidator.getCollectionRule.mock.calls.length).toBe(1);
    });
  });

  describe("getXXXRule", () => {
    beforeEach(() => {
      ruleValidator.getRuleForDbCollection = jest.fn();
    });

    it("getDocumentRule traverses the correct object properties", () => {
      const [lookups, proxyDoc] = getterTrackingProxy("doc");
      ruleValidator.getDocumentRule(proxyDoc, "tickle");
      expect(lookups).toEqual([
        "doc.collection",
        "doc.collection.database",
        "doc.collection.database.name",
        "doc.collection",
        "doc.collection.name"
      ]);
    });

    it("getCollectionRule traverses the correct object properties", () => {
      const [lookups, proxyDoc] = getterTrackingProxy("doc");
      ruleValidator.getCollectionRule(proxyDoc, "tickle");
      expect(lookups).toEqual(["doc.database", "doc.database.name", "doc.name"]);
    });
  });

  describe("getRuleForDbCollection", () => {
    const mock = {
      getRuleForDbCollection: RuleValidator.prototype.getRuleForDbCollection
    };

    // no rules
    expect(() => mock.getRuleForDbCollection("foo", "bar", "tickle")).toThrow();

    // empty rules
    mock.rules = {};
    expect(mock.getRuleForDbCollection("foo", "bar", "tickle")).toBe(undefined);

    // wrong database
    mock.rules = { foo: {} };
    expect(mock.getRuleForDbCollection("fizz", "bar", "tickle")).toBe(undefined);

    // right database - missing collection
    mock.rules = { foo: { bar: {} } };
    expect(mock.getRuleForDbCollection("foo", "fizz", "tickle")).toBe(undefined);

    // right database - correct collection - no operation
    mock.rules = { foo: { bar: {} } };
    expect(mock.getRuleForDbCollection("foo", "bar", "tickle")).toBe(undefined);

    // right database - correct collection - correct operation
    mock.rules = { foo: { bar: { tickle: 42 } } };
    expect(mock.getRuleForDbCollection("foo", "bar", "tickle")).toBe(42);
  });

  describe("validateRule", () => {
    it("Can fail on a executing rule", async () => {
      const doc = new MockDocumentReference("foo", "bar");

      const x = new RuleValidator({ foo: { bar: { tickle: () => false } } });

      expect(x.validateRule("tickle", doc, {}, {})).rejects.toEqual(
        new RuleError(`Operation TICKLE denied on 'undefined'.`)
      );
    });

    it("Can pass on a executing rule", async () => {
      const doc = new MockDocumentReference("foo", "bar");

      const x = new RuleValidator({ foo: { bar: { tickle: () => true } } });

      expect(x.validateRule("tickle", doc, {}, {})).resolves.toEqual(undefined);
    });

    it("Will pass when rule not found", () => {
      const doc = new MockDocumentReference("foo", "bar");

      const x = new RuleValidator({ foo: {} });

      expect(x.validateRule("tickle", doc, {}, {})).resolves.toEqual(undefined);
    });
  });
});
