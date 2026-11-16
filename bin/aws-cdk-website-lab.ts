
import * as cdk from 'aws-cdk-lib';

import { NetworkStack } from '../lib/network-stack';
import { ServerStack } from '../lib/Server-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Create Network Stack
const networkStack = new NetworkStack(app, 'NetworkStack', {
  env,
});

// Create Server Stack
new ServerStack(app, 'ServerStack', {
  env,
  vpc: networkStack.vpc,
});