import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
  randomInt,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export const code = () => String(randomInt(10000000, 100000000));
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return salt + ":" + key.toString("hex");
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, hex] = hash.split(":");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hex, "hex");
  return stored.length === key.length && timingSafeEqual(stored, key);
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
