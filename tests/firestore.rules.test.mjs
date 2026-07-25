import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

const [host, rawPort] = (
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"
).split(":");

const testEnvironment = await initializeTestEnvironment({
  projectId: "demo-mathsolver",
  firestore: {
    host,
    port: Number(rawPort),
    rules: readFileSync("firestore.rules", "utf8"),
  },
});

function validChat(id = "chat-1") {
  return {
    schemaVersion: 1,
    id,
    title: "Quadratic equation",
    messages: [],
    createdAt: 100,
    updatedAt: 200,
  };
}

test.afterEach(async () => {
  await testEnvironment.clearFirestore();
});

test.after(async () => {
  await testEnvironment.cleanup();
});

test("a signed-in user can create, read, and delete their own chat", async () => {
  const ownerDb = testEnvironment.authenticatedContext("owner").firestore();
  const chatRef = doc(ownerDb, "users", "owner", "chats", "chat-1");

  await assertSucceeds(setDoc(chatRef, validChat()));
  await assertSucceeds(getDoc(chatRef));
  await assertSucceeds(deleteDoc(chatRef));
});

test("other users and signed-out clients cannot access a private chat", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "users", "owner", "chats", "chat-1"),
      validChat(),
    );
  });

  const otherUserDb = testEnvironment
    .authenticatedContext("other-user")
    .firestore();
  const signedOutDb = testEnvironment.unauthenticatedContext().firestore();
  const otherUserChatRef = doc(
    otherUserDb,
    "users",
    "owner",
    "chats",
    "chat-1",
  );
  const signedOutChatRef = doc(
    signedOutDb,
    "users",
    "owner",
    "chats",
    "chat-1",
  );

  await assertFails(getDoc(otherUserChatRef));
  await assertFails(setDoc(otherUserChatRef, validChat()));
  await assertFails(getDoc(signedOutChatRef));
});

test("malformed chat documents are rejected", async () => {
  const ownerDb = testEnvironment.authenticatedContext("owner").firestore();
  const chatRef = doc(ownerDb, "users", "owner", "chats", "chat-1");

  await assertFails(
    setDoc(chatRef, {
      ...validChat(),
      updatedAt: 50,
    }),
  );
});

test("only the owner can write and read chat deletion tombstones", async () => {
  const ownerDb = testEnvironment.authenticatedContext("owner").firestore();
  const otherUserDb = testEnvironment
    .authenticatedContext("other-user")
    .firestore();
  const ownerDeletionRef = doc(
    ownerDb,
    "users",
    "owner",
    "chatDeletions",
    "chat-1",
  );
  const otherUserDeletionRef = doc(
    otherUserDb,
    "users",
    "owner",
    "chatDeletions",
    "chat-1",
  );

  await assertSucceeds(setDoc(ownerDeletionRef, { deletedAt: 300 }));
  await assertSucceeds(getDoc(ownerDeletionRef));
  await assertFails(getDoc(otherUserDeletionRef));
  await assertFails(setDoc(otherUserDeletionRef, { deletedAt: 400 }));
});
