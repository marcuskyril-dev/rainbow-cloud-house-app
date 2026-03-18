#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WishlistDataStack } from "../lib/data-stack";
import { WishlistAuthStack } from "../lib/auth-stack";
import { WishlistStorageStack } from "../lib/storage-stack";
import { WishlistApiStack } from "../lib/api-stack";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") ?? "dev";
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const dataStack = new WishlistDataStack(app, `Wishlist-Data-${stage}`, {
  env,
  stage,
});

const authStack = new WishlistAuthStack(app, `Wishlist-Auth-${stage}`, {
  env,
  stage,
});

const storageStack = new WishlistStorageStack(
  app,
  `Wishlist-Storage-${stage}`,
  { env, stage },
);

new WishlistApiStack(app, `Wishlist-Api-${stage}`, {
  env,
  stage,
  itemsTableName: `WishlistItems-${stage}`,
  contributionsTableName: `WishlistContributions-${stage}`,
  idempotencyTableName: `IdempotencyKeys-${stage}`,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  imagesBucket: storageStack.imagesBucket,
});

app.synth();
