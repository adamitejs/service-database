const { DocumentReference, CollectionReference } = require("@adamite/sdk");
const RuleError = require("./RuleError");

class RuleValidator {
  constructor(rules) {
    this.rules = rules;
  }

  getRuleForDbCollection(databaseName, collectionName, operation) {
    const databaseRule = this.rules[databaseName];
    if (!databaseRule) return;

    const collectionRule = databaseRule[collectionName];
    if (!collectionRule) return;

    return collectionRule[operation];
  }

  getDocumentRule(ref, operation) {
    return this.getRuleForDbCollection(ref.collection.database.name, ref.collection.name, operation);
  }

  getCollectionRule(ref, operation) {
    return this.getRuleForDbCollection(ref.database.name, ref.name, operation);
  }

  getRuleForRef(ref, operation) {
    if (ref instanceof DocumentReference) {
      return this.getDocumentRule(ref, operation);
    } else if (ref instanceof CollectionReference) {
      return this.getCollectionRule(ref, operation);
    }
    //TODO: throw ??
  }

  async validateRule(operation, ref, request, response) {
    const rule = this.getRuleForRef(ref, operation);
    if (!rule) return; // no rule, no prob

    const valid = await rule(request, response);
    if (!valid) throw new RuleError(`Operation ${operation.toUpperCase()} denied on '${ref.id || ref.name}'.`);
  }
}

module.exports = RuleValidator;
