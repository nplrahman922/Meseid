export class ModelAccessError extends Error {
  constructor(
    public readonly statusCode: 400 | 403 | 404,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ModelAccessError";
  }
}
