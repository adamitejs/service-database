function createDeferred() {
  let resolve, reject;

  let promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  // scope the result, instead of using this
  let result = {};

  result = {
    ...result,
    state: "pending",
    data: null,
    err: null,
    promise,
    resolve: arg => {
      result.data = arg;
      result.state = "resolved";
      resolve(arg);
    },
    reject: err => {
      result.err = err;
      result.state = "rejected";
      reject(err);
    }
  };

  return result;
}

module.exports = createDeferred;
