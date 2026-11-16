import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as rds from 'aws-cdk-lib/aws-rds';

interface ServerStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class ServerStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: ServerStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;

    // 1. Web Server Security Group
    const webSG = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc,
      description: 'Allow HTTP traffic to web servers',
      allowAllOutbound: true,
    });

    webSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from anywhere'
    );

    // 2. Load Balancer Security Group
    const albSG = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      description: 'Allow HTTP traffic to load balancer',
      allowAllOutbound: true,
    });

    albSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from internet'
    );

    // 3. Create EC2 Web Server 1
    const webServer1 = new ec2.Instance(this, 'WebServer1', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        availabilityZones: [vpc.availabilityZones[0]],
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: webSG,
      associatePublicIpAddress: true,
    });

    webServer1.addUserData(
      '#!/bin/bash',
      'dnf install -y httpd',
      'systemctl enable httpd',
      'systemctl start httpd',
      'echo "<h1>Welcome to Web Server 1</h1>" > /var/www/html/index.html'
    );

    // 4. Create EC2 Web Server 2
    const webServer2 = new ec2.Instance(this, 'WebServer2', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        availabilityZones: [vpc.availabilityZones[1]],
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: webSG,
      associatePublicIpAddress: true,
    });

    webServer2.addUserData(
      '#!/bin/bash',
      'dnf install -y httpd',
      'systemctl enable httpd',
      'systemctl start httpd',
      'echo "<h1>Welcome to Web Server 2</h1>" > /var/www/html/index.html'
    );

    // 5. Database Security Group
    const dbSG = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Allow MySQL from web servers only',
      allowAllOutbound: true,
    });

    dbSG.addIngressRule(
      webSG,
      ec2.Port.tcp(3306),
      'Allow MySQL from web servers'
    );

    // 6. Create MySQL RDS Database
    const database = new rds.DatabaseInstance(this, 'WebsiteDatabase', {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSG],
      databaseName: 'webappdb',
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      allocatedStorage: 20,
      publiclyAccessible: false,
      multiAz: false,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 7. Create Application Load Balancer
    const loadBalancer = new elbv2.ApplicationLoadBalancer(
      this,
      'WebsiteLoadBalancer',
      {
        vpc,
        internetFacing: true,
        securityGroup: albSG,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
      }
    );

    // 8. Create HTTP Listener and connect EC2 servers
    const listener = loadBalancer.addListener('HttpListener', {
      port: 80,
      open: true,
    });

    listener.addTargets('WebServers', {
      port: 80,
      targets: [
        new targets.InstanceTarget(webServer1),
        new targets.InstanceTarget(webServer2),
      ],
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200',
      },
    });

    // 9. Display important information
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: loadBalancer.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.dbInstanceEndpointAddress,
    });

    new cdk.CfnOutput(this, 'DatabaseSecret', {
      value: database.secret?.secretName ?? 'No secret generated',
    });
  }
}