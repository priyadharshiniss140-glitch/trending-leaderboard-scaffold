// test.js — prove the leaderboard ranks posts and returns their metadata.
// Run with: npm test (run npm run seed first).

import assert from "node:assert/strict";
import { upvote, getTop, redis } from "./leaderboard.js";

async function run() {
  const target = "post:50";

  try {
    // Raise a low-scored post 50 times; every ZINCRBY is atomic.
    for (let i = 0; i < 50; i++) {
      await upvote(target);
    }

    const top = await getTop(10);
    console.log("Top 10:");
    top.forEach((post, i) => {
      console.log(
        `  #${i + 1}  ${post.id}  score=${post.score}  ${post.title} (${post.author})`,
      );
    });

    const targetRow = top.find((post) => post.id === target);
    assert.ok(targetRow, `${target} should reach the top 10 after 50 upvotes`);
    assert.equal(targetRow.title, "Post number 50");
    assert.equal(targetRow.author, "@user50");
    assert.ok(Number(targetRow.score) >= 50);

    console.log(`\nPASS ✅  ${target} reached the top 10`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await redis.quit();
  }
}

run();
