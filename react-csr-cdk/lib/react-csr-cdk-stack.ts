import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  CfnParameter,
  CfnOutput,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
} from "aws-cdk-lib";
import * as cdk from "@aws-cdk/core";

export class ReactCsrCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const uploadBucketName = new CfnParameter(this, "uploadBucketName", {
      type: "String",
      description:
        "The name of the Amazon S3 bucket where uploaded files will be stored.",
    });

    const mySiteBucket = new s3.Bucket(this, "uploadBucket", {
      bucketName: uploadBucketName.valueAsString,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      publicReadAccess: true,
      //only for demo not to use in production
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new s3deploy.BucketDeployment(this, "Client-side React app", {
      sources: [s3deploy.Source.asset("../react-csr/build/")],
      destinationBucket: mySiteBucket,
    });

    new CfnOutput(this, "Bucket", { value: mySiteBucket.bucketName });
    new CfnOutput(this, "BucketUrl", { value: mySiteBucket.bucketWebsiteUrl });

    // const originAccessIdentity = new cloudfront.OriginAccessIdentity(
    //   this,
    //   "ssr-oia"
    // );
    // mySiteBucket.grantRead(originAccessIdentity);

    // const distribution = new cloudfront.Distribution(this, "myDist", {
    //   defaultBehavior: { origin: new origins.S3Origin(mySiteBucket) },
    // });

    // new CfnOutput(this, "distributionDomainName", {
    //   value: distribution.domainName,
    // });
  }
}
