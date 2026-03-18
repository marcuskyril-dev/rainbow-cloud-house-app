import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
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
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
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

    new cdk.CfnOutput(this, "ImagesBucketName", {
      value: this.imagesBucket.bucketName,
      exportName: `ImagesBucketName-${props.stage}`,
    });
  }
}
