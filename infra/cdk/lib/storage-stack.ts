import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface StorageStackProps extends cdk.StackProps {
  stage: string;
}

export class WishlistStorageStack extends cdk.Stack {
  public readonly imagesBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    this.imagesBucket = new s3.Bucket(this, "ImagesBucket", {
      bucketName: `wishlist-images-${props.stage}-${this.account}`,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        // Allow a bucket policy that grants public GET so item images are
        // accessible directly via the S3 HTTPS URL stored in DynamoDB.
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ["*"],
          maxAge: 3600,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    this.imagesBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [`${this.imagesBucket.bucketArn}/items/*`],
      }),
    );

    new cdk.CfnOutput(this, "ImagesBucketName", {
      value: this.imagesBucket.bucketName,
      exportName: `ImagesBucketName-${props.stage}`,
    });
  }
}
