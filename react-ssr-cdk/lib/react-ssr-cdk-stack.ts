import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CfnParameter,
  CfnOutput,
  aws_ec2 as ec2,
  aws_iam as iam,
} from "aws-cdk-lib";
import { KeyPair } from "cdk-ec2-key-pair";

export class ReactSsrCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    // Create new VPC with 2 Subnets
    const vpc = new ec2.Vpc(this, "VPC", {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "asterisk",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // Allow SSH (TCP Port 22) access from anywhere
    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc,
      description: "Allow SSH (TCP port 22) in",
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "Allow SSH Access" //??
    );

    const role = new iam.Role(this, "ec2Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    // Use Latest Amazon Linux Image - CPU Type ARM64
    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
    });

    const key = new KeyPair(this, "A-Key-Pair", {
      name: "a-key-pair",
      description: "This is a Key Pair",
      storePublicKey: true, // by default the public key will not be stored in Secrets Manager
    });

    // Create the instance using the Security Group, AMI, and KeyPair defined in the VPC created
    const ec2Instance = new ec2.Instance(this, "Instance", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ami,
      securityGroup: securityGroup,
      keyName: key.keyPairName,
      role: role,
    });

    // Create outputs for connecting
    new CfnOutput(this, "IP Address", {
      value: ec2Instance.instancePublicIp,
    });

    // new cdk.CfnOutput(this, 'Key Name', { value: key.keyPairName })
    new CfnOutput(this, "Download Key Command", {
      value:
        "aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem",
    });
    new CfnOutput(this, "ssh command", {
      value:
        "ssh -i cdk-key.pem -o IdentitiesOnly=yes ec2-user@" +
        ec2Instance.instancePublicIp,
    });
  }
}
