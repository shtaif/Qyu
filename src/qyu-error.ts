class QyuError<CodeType extends string> extends Error {
  code: CodeType | undefined;

  constructor(code?: CodeType, message?: string) {
    super(message);
    this.code = code;
    // Maintains proper stack trace for where our error was thrown (only available on V8) (reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#es6_customerror_class)
    (Error as any).captureStackTrace?.(this, new.target);
  }
}

export default QyuError;
