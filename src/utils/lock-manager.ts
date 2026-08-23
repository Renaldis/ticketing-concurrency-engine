import { randomUUID } from 'crypto';
import redis from '../config/redis.js';

export class LockManager {
  /**
   * Mencoba mendapatkan lock (Acquire Lock)
   * @param resourceName Nama resourcenya (misal: ticket_category_id)
   * @param ttlMs Waktu kunci bertahan dalam milidetik (mencegah Deadlock jika server crash)
   * @returns token acak jika berhasil, atau null jika gagal
   */
  static async acquireLock(resourceName: string, ttlMs: number): Promise<string | null> {
    const lockKey = `lock:${resourceName}`;
    const token = randomUUID(); // Token unik untuk mengidentifikasi pemilik lock ini

    // Sintaks Redis 'NX' (Not Exists) + 'PX' (Masa kedaluwarsa PX milidetik)
    // Akan mengembalikan string 'OK' jika berhasil, atau null jika kunci sudah ada.
    const result = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');

    if (result === 'OK') {
      return token; // Berhasil mengunci resourcenya
    }

    return null; // Gagal mengunci (sedang dikunci transaksi lain)
  }

  /**
   * Melepaskan lock (Release Lock)
   * Menggunakan script LUA agar pengecekan token & penghapusan berjalan AMAN dan ATOMIK
   */
  static async releaseLock(resourceName: string, token: string): Promise<boolean> {
    const lockKey = `lock:${resourceName}`;

    // Script LUA untuk menjamin kita HANYA menghapus lock milik kita sendiri (tidak sengaja menghapus lock transaksi lain)
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(luaScript, 1, lockKey, token);
    return result === 1;
  }
}
