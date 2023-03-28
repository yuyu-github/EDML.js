export default class EDMLError extends Error {
  constructor(exception: any) {
    let message = (exception.name ?? 'Error') + (exception.message != null ? ': ' + exception.message : '');
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
