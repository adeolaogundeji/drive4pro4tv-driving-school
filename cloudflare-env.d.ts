declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    EMPLOYEE_SIGNUP_CODE?: string;
  }
}
