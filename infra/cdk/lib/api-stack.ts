import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as path from "path";
import { Construct } from "constructs";

interface ApiStackProps extends cdk.StackProps {
  stage: string;
  itemsTableName: string;
  contributionsTableName: string;
  idempotencyTableName: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  imagesBucket: s3.Bucket;
}

export class WishlistApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const lambdaDir = path.join(__dirname, "../../lambda");

    // Import tables by name to avoid cross-stack export dependencies.
    // This allows deploying the API stack even if the Data stack update is blocked.
    const itemsTable = dynamodb.Table.fromTableName(
      this,
      "ItemsTable",
      props.itemsTableName,
    );
    const contributionsTable = dynamodb.Table.fromTableName(
      this,
      "ContributionsTable",
      props.contributionsTableName,
    );
    const idempotencyTable = dynamodb.Table.fromTableName(
      this,
      "IdempotencyTable",
      props.idempotencyTableName,
    );

    const commonEnv: Record<string, string> = {
      ITEMS_TABLE: props.itemsTableName,
      CONTRIBUTIONS_TABLE: props.contributionsTableName,
      IDEMPOTENCY_TABLE: props.idempotencyTableName,
      IMAGES_BUCKET: props.imagesBucket.bucketName,
      COGNITO_USER_POOL_ID: props.userPool.userPoolId,
      COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
    };

    const fnDefaults: Omit<lambda.FunctionProps, "handler"> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      code: lambda.Code.fromAsset(lambdaDir, {
        exclude: ["src", "*.ts", "tsconfig.json"],
      }),
      environment: commonEnv,
    };

    // --- Lambda functions ---

    const getItemsFn = new lambda.Function(this, "GetItemsFn", {
      ...fnDefaults,
      functionName: `wishlist-getItems-${props.stage}`,
      handler: "dist/handlers/getItems.handler",
    });

    const createItemFn = new lambda.Function(this, "CreateItemFn", {
      ...fnDefaults,
      functionName: `wishlist-createItem-${props.stage}`,
      handler: "dist/handlers/createItem.handler",
    });

    const updateItemFn = new lambda.Function(this, "UpdateItemFn", {
      ...fnDefaults,
      functionName: `wishlist-updateItem-${props.stage}`,
      handler: "dist/handlers/updateItem.handler",
    });

    const deleteItemFn = new lambda.Function(this, "DeleteItemFn", {
      ...fnDefaults,
      functionName: `wishlist-deleteItem-${props.stage}`,
      handler: "dist/handlers/deleteItem.handler",
    });

    const contributeFn = new lambda.Function(this, "ContributeFn", {
      ...fnDefaults,
      functionName: `wishlist-contribute-${props.stage}`,
      handler: "dist/handlers/contribute.handler",
    });

    const getItemContributionsFn = new lambda.Function(
      this,
      "GetItemContributionsFn",
      {
        ...fnDefaults,
        functionName: `wishlist-getItemContributions-${props.stage}`,
        handler: "dist/handlers/getItemContributions.handler",
      },
    );

    const authLoginFn = new lambda.Function(this, "AuthLoginFn", {
      ...fnDefaults,
      functionName: `wishlist-authLogin-${props.stage}`,
      handler: "dist/handlers/authLogin.handler",
    });

    const metadataFetchFn = new lambda.Function(this, "MetadataFetchFn", {
      ...fnDefaults,
      functionName: `wishlist-metadataFetch-${props.stage}`,
      handler: "dist/handlers/metadataFetch.handler",
    });

    const presignUploadFn = new lambda.Function(this, "PresignUploadFn", {
      ...fnDefaults,
      functionName: `wishlist-presignUpload-${props.stage}`,
      handler: "dist/handlers/presignUpload.handler",
    });

    // --- IAM grants ---

    itemsTable.grantReadData(getItemsFn);
    contributionsTable.grantReadData(getItemContributionsFn);

    // When querying a GSI, the IAM resource must include the index ARN.
    // `grantReadData()` on an imported table may not cover `/index/*`.
    getItemsFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Query"],
        resources: [`${itemsTable.tableArn}/index/*`],
      }),
    );

    for (const fn of [createItemFn, updateItemFn, deleteItemFn]) {
      itemsTable.grantReadWriteData(fn);
      contributionsTable.grantReadData(fn);
    }

    for (const fn of [contributeFn]) {
      itemsTable.grantReadWriteData(fn);
      contributionsTable.grantReadWriteData(fn);
      idempotencyTable.grantReadWriteData(fn);
    }

    props.imagesBucket.grantReadWrite(createItemFn);
    props.imagesBucket.grantReadWrite(updateItemFn);
    props.imagesBucket.grantPut(presignUploadFn);

    // --- API Gateway ---

    const api = new apigateway.RestApi(this, "WishlistApi", {
      restApiName: `wishlist-api-${props.stage}`,
      deployOptions: { stageName: props.stage },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Request-Id",
          "X-Amz-Date",
          "X-Api-Key",
        ],
      },
    });

    // Ensure CORS headers are present even on API Gateway-generated errors
    // (e.g. Cognito authorizer 401/403), otherwise browsers surface "CORS error".
    const gatewayCorsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "'*'",
      "Access-Control-Allow-Headers":
        "'Content-Type,Authorization,X-Request-Id,X-Amz-Date,X-Api-Key'",
      "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
    };

    api.addGatewayResponse("Default4xxWithCors", {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: gatewayCorsHeaders,
    });

    api.addGatewayResponse("Default5xxWithCors", {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: gatewayCorsHeaders,
    });

    api.addGatewayResponse("UnauthorizedWithCors", {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: gatewayCorsHeaders,
    });

    api.addGatewayResponse("AccessDeniedWithCors", {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: gatewayCorsHeaders,
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuth",
      {
        cognitoUserPools: [props.userPool],
        identitySource: "method.request.header.Authorization",
      },
    );

    const adminMethodOptions: apigateway.MethodOptions = {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // --- Routes ---

    // GET /items (public)
    const itemsResource = api.root.addResource("items");
    itemsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getItemsFn),
    );

    // POST /items (admin)
    itemsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createItemFn),
      adminMethodOptions,
    );

    // PUT /items/{id} (admin)
    const itemByIdResource = itemsResource.addResource("{id}");
    itemByIdResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(updateItemFn),
      adminMethodOptions,
    );

    // GET /items/{id}/contributions (public)
    const itemContributionsResource = itemByIdResource.addResource(
      "contributions",
    );
    itemContributionsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getItemContributionsFn),
    );

    // DELETE /items/{id} (admin)
    itemByIdResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(deleteItemFn),
      adminMethodOptions,
    );

    // POST /items/{id}/metadata-fetch (admin)
    const itemMetadataFetchResource = itemByIdResource.addResource(
      "metadata-fetch",
    );
    itemMetadataFetchResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(metadataFetchFn),
      adminMethodOptions,
    );

    // POST /metadata-fetch (admin) - supports autofill while creating items
    const metadataFetchResource = api.root.addResource("metadata-fetch");
    metadataFetchResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(metadataFetchFn),
      adminMethodOptions,
    );

    // POST /contribute (public)
    const contributeResource = api.root.addResource("contribute");
    contributeResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(contributeFn),
    );

    // POST /uploads/presign (admin - generate S3 presigned PUT URL)
    const uploadsResource = api.root.addResource("uploads");
    const presignResource = uploadsResource.addResource("presign");
    presignResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(presignUploadFn),
      adminMethodOptions,
    );

    // POST /auth/login (public - exchanges email/password for Cognito token)
    const authResource = api.root.addResource("auth");
    const authLoginResource = authResource.addResource("login");
    authLoginResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(authLoginFn),
    );

    // --- Outputs ---

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      exportName: `ApiUrl-${props.stage}`,
    });
  }
}
