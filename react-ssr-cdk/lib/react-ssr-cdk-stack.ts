import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CfnParameter,
  CfnOutput,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_s3_assets as s3Asset,
} from "aws-cdk-lib";
import * as path from "path";
import { KeyPair } from "cdk-ec2-key-pair";
import { readFileSync } from "fs";

export class ReactSsrCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const key = new KeyPair(this, "cdk-key-pair", {
      name: "cdk-key-pair",
      description: "This is a Key Pair",
      storePublicKey: true, // by default the public key will not be stored in Secrets Manager
    });

    // create VPC in which we'll launch the Instance
    const vpc = new ec2.Vpc(this, "my-cdk-vpc", {
      cidr: "10.0.0.0/16",
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC },
      ],
    });

    // create Security Group for the Instance
    const webserverSG = new ec2.SecurityGroup(this, "webserver-sg", {
      vpc,
      allowAllOutbound: true,
    });

    // create a Role for the EC2 Instance
    const webserverRole = new iam.Role(this, "webserver-role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess"),
      ],
    });

    webserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "allow SSH access from anywhere"
    );

    webserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "allow HTTP traffic from anywhere"
    );

    webserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "allow HTTPS traffic from anywhere"
    );

    // 👇 create the EC2 Instance
    const ec2Instance = new ec2.Instance(this, "ec2-instance", {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role: webserverRole,
      securityGroup: webserverSG,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      keyName: key.keyPairName,
    });

    new CfnOutput(this, "Download Key Command", {
      value: `aws secretsmanager get-secret-value --secret-id ec2-ssh-key/${key.keyPairName}/private --query SecretString --output text > ${key.keyPairName}.pem && chmod 400 ${key.keyPairName}.pem`,
    });

    new CfnOutput(this, "Public IP Address", {
      value: ec2Instance.instancePublicIp,
    });

    new CfnOutput(this, "ssh command", {
      value: `ssh -i ${key.keyPairName}.pem -o IdentitiesOnly=yes ec2-user@${ec2Instance.instancePublicIp}`,
    });

    new CfnOutput(this, "scp setup script", {
      value: `scp -i ${key.keyPairName}.pem ./src/setupNode.sh ec2-user@${ec2Instance.instancePublicDnsName}:./`,
    });

    new CfnOutput(this, "scp express zip", {
      value: `scp -i ${key.keyPairName}.pem ../react-ssr.zip ec2-user@${ec2Instance.instancePublicDnsName}:./`,
    });
  }
}
