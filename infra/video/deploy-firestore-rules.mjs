#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ?? "math-solver-e3a55";
const releaseName = `projects/${projectId}/releases/cloud.firestore`;
const rulesPath = resolve(process.cwd(), "firestore.rules");

function accessToken() {
  const result = spawnSync("gcloud", ["auth", "print-access-token"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() || "Unable to obtain a Google Cloud access token.",
    );
  }

  const token = result.stdout.trim();
  if (!token) {
    throw new Error("Google Cloud returned an empty access token.");
  }
  return token;
}

async function rulesRequest(token, path, init = {}) {
  const response = await fetch(`https://firebaserules.googleapis.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": projectId,
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      body?.error?.message ?? `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function main() {
  const [token, content] = await Promise.all([
    Promise.resolve(accessToken()),
    readFile(rulesPath, "utf8"),
  ]);

  const ruleset = await rulesRequest(
    token,
    `projects/${projectId}/rulesets`,
    {
      method: "POST",
      body: JSON.stringify({
        source: {
          files: [{ name: "firestore.rules", content }],
        },
      }),
    },
  );

  if (!ruleset.name) {
    throw new Error("Rules API created a ruleset without returning its name.");
  }

  const releaseBody = {
    release: {
      name: releaseName,
      rulesetName: ruleset.name,
    },
    updateMask: "rulesetName",
  };

  try {
    await rulesRequest(
      token,
      `${releaseName}?updateMask=rulesetName`,
      {
        method: "PATCH",
        body: JSON.stringify(releaseBody),
      },
    );
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    await rulesRequest(token, `projects/${projectId}/releases`, {
      method: "POST",
      body: JSON.stringify({
        name: releaseName,
        rulesetName: ruleset.name,
      }),
    });
  }

  const release = await rulesRequest(token, releaseName);
  if (release.rulesetName !== ruleset.name) {
    throw new Error("The Firestore release does not reference the new ruleset.");
  }

  console.log(`Published ${ruleset.name} to ${releaseName}.`);
}

main().catch((error) => {
  console.error(`Firestore rules deployment failed: ${error.message}`);
  process.exitCode = 1;
});
