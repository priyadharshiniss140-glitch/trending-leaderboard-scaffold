// leaderboard.js — trending leaderboard backed by a sorted set and metadata hashes.

import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL);

// Storage shape:
//   trending:posts   sorted set: member = post id, score = engagement
//   post:<id>:meta   hash: title, author

/**
 * Record one upvote using a single atomic Redis command.
 * @param {string} postId e.g. "post:104"
 * @returns {Promise<string>} the post's new score
 */
export async function upvote(postId) {
  return redis.zincrby("trending:posts", 1, postId);
}

/**
 * Fetch the top N posts and their metadata. All HGETALL commands are issued
 * together through a single pipeline rather than one network round trip per post.
 * @param {number} n number of ranked posts to return
 * @returns {Promise<Array<{ id: string, score: number, title?: string, author?: string }>>}
 */
export async function getTop(n) {
  if (!Number.isInteger(n) || n <= 0) return [];

  const flat = await redis.zrevrange("trending:posts", 0, n - 1, "WITHSCORES");
  const rows = [];
  const pipeline = redis.pipeline();

  for (let i = 0; i < flat.length; i += 2) {
    rows.push({ id: flat[i], score: Number(flat[i + 1]) });
    pipeline.hgetall(flat[i] + ":meta");
  }

  const results = await pipeline.exec();
  return rows.map((row, k) => {
    const [error, metadata] = results[k];
    if (error) throw error;
    return { ...row, ...metadata };
  });
}

export { redis };
