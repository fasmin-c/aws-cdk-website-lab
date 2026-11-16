import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class NetworkStack extends cdk.Stack {

  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with 2 Availability Zones
    this.vpc = new ec2.Vpc(this, 'WebsiteVPC', {

      vpcName: 'Website-VPC',

      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),

      maxAzs: 2,

      natGateways: 0,

      subnetConfiguration: [

        // Public Subnets
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },

        // Private Isolated Subnets
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },

      ],
    });
  }
}