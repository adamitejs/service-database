const { DocumentReference, CollectionReference } = require('@adamite/sdk/database');
const RuleError = require('./RuleError');

class RuleValidator {
  constructor(rules) {
    this.rules = rules;
  }

  getRuleForRef(ref, operation) {
    if (ref instanceof DocumentReference) {
      const databaseRule = this.rules[ref.collection.database.name];
      if (!databaseRule) return;

      const collectionRule = databaseRule[ref.collection.name];
      if (!collectionRule) return;

      return collectionRule[operation];
    } else if (ref instanceof CollectionReference) {
      const databaseRule = this.rules[ref.database.name];
      if (!databaseRule) return;

      const collectionRule = databaseRule[ref.name];
      if (!collectionRule) return;

      return collectionRule[operation];
    }
  }

  async validateRule(operation, ref, request, response) {
    const rule = this.getRuleForRef(ref, operation);
    if (!rule) return; // no rule, no prob

    const valid = await rule(request, response);
    if (!valid) throw new RuleError(`Operation ${operation.toUpperCase()} denied on '${ref.id || ref.name}'.`);
  }
}

module.exports = RuleValidator;