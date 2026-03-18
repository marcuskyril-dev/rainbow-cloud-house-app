import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

interface DataStackProps extends cdk.StackProps {
  stage: string;
}

export class WishlistDataStack extends cdk.Stack {
  public readonly wishlistTable: dynamodb.Table;
  public readonly itemsTable: dynamodb.Table;
  public readonly contributionsTable: dynamodb.Table;
  public readonly idempotencyTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.wishlistTable = new dynamodb.Table(this, "WishlistTable", {
      tableName: `WishlistApp-${props.stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.wishlistTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.itemsTable = new dynamodb.Table(this, "WishlistItemsTable", {
      tableName: `WishlistItems-${props.stage}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Mirrors existing list-by-status query shape (GSI1PK/GSI1SK) but only for items.
    this.itemsTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.contributionsTable = new dynamodb.Table(
      this,
      "WishlistContributionsTable",
      {
        tableName: `WishlistContributions-${props.stage}`,
        partitionKey: { name: "itemId", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    );

    this.idempotencyTable = new dynamodb.Table(this, "IdempotencyTable", {
      tableName: `IdempotencyKeys-${props.stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, "WishlistTableName", {
      value: this.wishlistTable.tableName,
      exportName: `WishlistTableName-${props.stage}`,
    });

    new cdk.CfnOutput(this, "WishlistItemsTableName", {
      value: this.itemsTable.tableName,
      exportName: `WishlistItemsTableName-${props.stage}`,
    });

    new cdk.CfnOutput(this, "WishlistContributionsTableName", {
      value: this.contributionsTable.tableName,
      exportName: `WishlistContributionsTableName-${props.stage}`,
    });
  }
}
